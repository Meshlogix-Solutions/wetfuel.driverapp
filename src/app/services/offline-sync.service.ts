import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DriverApiService, OfflineDriverEvent } from './driver-api.service';
import { ConnectivityService } from './connectivity.service';
import { DriverCacheService } from './driver-cache.service';
import {
  isPendingUploadUrl,
  OfflineStoreService,
  PENDING_UPLOAD_PREFIX,
  QueuedDriverEvent,
} from './offline-store.service';

export interface FlushJobResult {
  success: boolean;
  syncedEventIds: string[];
  warnings: Array<{ clientEventId: string; code: string; message: string }>;
  error?: string;
  needsArrivalConfirm?: boolean;
}

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  readonly pendingJobIds = signal<string[]>([]);
  readonly syncing = signal(false);
  readonly lastFlushError = signal('');

  private flushPromise: Promise<void> | null = null;

  constructor(
    private readonly api: DriverApiService,
    private readonly connectivity: ConnectivityService,
    private readonly store: OfflineStoreService,
    private readonly cache: DriverCacheService,
  ) {}

  async refreshPendingJobs(): Promise<void> {
    this.pendingJobIds.set(await this.store.getPendingSyncJobIds());
  }

  startAutoSync(): void {
    this.connectivity.onChange(online => {
      if (online) {
        void this.flushAllPendingJobs().then(() => this.cache.refreshIfOnline());
      }
    });
    void this.refreshPendingJobs();
    if (this.connectivity.online()) {
      void this.flushAllPendingJobs().then(() => this.cache.refreshIfOnline());
    }
  }

  async flushJobs(jobIds: string[]): Promise<{
    synced: string[];
    failed: Array<{ jobId: string; error: string; needsArrivalConfirm?: boolean }>;
  }> {
    const synced: string[] = [];
    const failed: Array<{ jobId: string; error: string; needsArrivalConfirm?: boolean }> = [];
    for (const jobId of jobIds) {
      const result = await this.flushJob(jobId);
      if (result.success) synced.push(jobId);
      else failed.push({
        jobId,
        error: result.error ?? 'Sync failed.',
        needsArrivalConfirm: result.needsArrivalConfirm,
      });
    }
    return { synced, failed };
  }

  isArrivalGeofenceError(error?: string): boolean {
    return !!error?.toLowerCase().includes('not on the customer site');
  }

  async confirmOutsideArrival(jobId: string): Promise<void> {
    const events = await this.store.getUnsyncedEventsForJob(jobId);
    await Promise.all(events
      .filter(event => event.eventType === 'job.arrived')
      .map(event => this.store.updateEventPayload(event.clientEventId, {
        ...event.payload,
        confirmOutsideTerritory: true,
      })));
  }

  async flushAllPendingJobs(): Promise<void> {
    if (!this.connectivity.online()) return;
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.runFlushAll().finally(() => { this.flushPromise = null; });
    return this.flushPromise;
  }

  async flushJob(jobId: string): Promise<FlushJobResult> {
    if (!this.connectivity.online()) {
      return { success: false, syncedEventIds: [], warnings: [], error: 'No internet connection.' };
    }
    this.syncing.set(true);
    this.lastFlushError.set('');
    try {
      await this.uploadPendingPhotosForJob(jobId);
      const events = await this.store.getUnsyncedEventsForJob(jobId);
      if (!events.length) {
        await this.markJobSynced(jobId);
        return { success: true, syncedEventIds: [], warnings: [] };
      }
      const result = await this.syncEvents(events);
      if (!result.success) return result;
      await this.markJobSynced(jobId);
      await this.store.clearSyncedEventsForJob(jobId);
      if (events.some(event => event.eventType === 'delivery.completed')) {
        localStorage.removeItem(`driver_delivery_draft:${jobId}`);
      }
      await this.refreshPendingJobs();
      void this.cache.refreshIfOnline();
      return result;
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string }; message?: string };
      const message = failure.error?.message ?? failure.message ?? 'Sync failed.';
      this.lastFlushError.set(message);
      return {
        success: false,
        syncedEventIds: [],
        warnings: [],
        error: message,
        needsArrivalConfirm: this.isArrivalGeofenceError(message),
      };
    } finally {
      this.syncing.set(false);
    }
  }

  private async runFlushAll(): Promise<void> {
    const jobIds = await this.store.getPendingSyncJobIds();
    for (const jobId of jobIds) {
      const result = await this.flushJob(jobId);
      if (!result.success) break;
    }
  }

  private async uploadPendingPhotosForJob(jobId: string): Promise<void> {
    const uploads = await this.store.getPendingUploadsForJob(jobId);
    const saved: Array<{ id: string; pendingUrl: string; serverUrl: string; kind: 'meter' | 'equipment' }> = [];
    for (const upload of uploads) {
      const file = new File([upload.blob], upload.fileName, { type: upload.mimeType });
      const serverUrl = await firstValueFrom(this.api.uploadFile(file));
      if (!isSavedPhotoLink(serverUrl)) throw new Error('The evidence photo did not return a saved link.');
      saved.push({
        id: upload.id,
        pendingUrl: `${PENDING_UPLOAD_PREFIX}${upload.id}`,
        serverUrl,
        kind: upload.kind,
      });
    }

    const events = await this.store.getUnsyncedEventsForJob(jobId);
    for (const event of events) {
      if (event.eventType !== 'delivery.completed') continue;
      const payload = { ...event.payload };
      const proof = { ...(payload['proof'] as Record<string, unknown> | undefined) };
      for (const photo of saved) {
        if (photo.kind === 'meter') proof['meterPhotoUrl'] = photo.serverUrl;
        else if (photo.kind === 'equipment') proof['equipmentPhotoUrl'] = photo.serverUrl;
        else if (proof['meterPhotoUrl'] === photo.pendingUrl) proof['meterPhotoUrl'] = photo.serverUrl;
        else if (proof['equipmentPhotoUrl'] === photo.pendingUrl) proof['equipmentPhotoUrl'] = photo.serverUrl;
      }
      payload['proof'] = proof;
      await this.store.updateEventPayload(event.clientEventId, payload);
    }

    for (const photo of saved) await this.store.deletePendingUpload(photo.id);

    const refreshed = await this.store.getUnsyncedEventsForJob(jobId);
    for (const event of refreshed) {
      if (event.eventType !== 'delivery.completed') continue;
      const proof = event.payload['proof'] as Record<string, unknown> | undefined;
      if (!isSavedPhotoLink(proof?.['meterPhotoUrl']) || !isSavedPhotoLink(proof?.['equipmentPhotoUrl'])) {
        throw new Error('Both evidence photo links must be saved before this delivery can sync.');
      }
    }
  }

  private async syncEvents(events: QueuedDriverEvent[]): Promise<FlushJobResult> {
    const payload: OfflineDriverEvent[] = events.map(({ synced: _synced, ...event }) => event);
    try {
      const result = await firstValueFrom(this.api.sync(payload));
      const syncedIds = [
        ...(result.acceptedEventIds ?? []),
        ...(result.alreadyProcessedEventIds ?? []),
      ];
      await this.store.markEventsSynced(syncedIds);
      return {
        success: true,
        syncedEventIds: syncedIds,
        warnings: result.warnings ?? [],
      };
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string }; message?: string };
      const message = failure.error?.message ?? failure.message ?? 'Sync failed.';
      this.lastFlushError.set(message);
      return {
        success: false,
        syncedEventIds: [],
        warnings: [],
        error: message,
        needsArrivalConfirm: this.isArrivalGeofenceError(message),
      };
    }
  }

  private async markJobSynced(jobId: string): Promise<void> {
    const local = await this.store.getLocalJob(jobId);
    if (!local) return;
    await this.store.saveLocalJob({ ...local, syncStatus: 'synced', updatedAt: new Date().toISOString() });
  }

  resolvePendingUrl(url: string | undefined): string | undefined {
    if (!url || !isPendingUploadUrl(url)) return url;
    return url;
  }
}

function isSavedPhotoLink(value: unknown): boolean {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}
