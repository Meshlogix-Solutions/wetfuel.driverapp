import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DriverApiService,
  DriverEquipment,
  DriverJob,
  DriverVehicle,
  OfflineDriverEvent,
} from './driver-api.service';
import { ConnectivityService } from './connectivity.service';
import {
  isPendingUploadUrl,
  LocalJobRecord,
  OfflineStoreService,
  PENDING_UPLOAD_PREFIX,
  pendingUploadId,
} from './offline-store.service';
import { OfflineSyncService } from './offline-sync.service';

interface DeliveryDraft {
  startingTotalizer?: number;
  endingTotalizer?: number;
  notes?: string;
  meterPhotoCaptured: boolean;
  equipmentPhotoCaptured: boolean;
  meterPhotoUrl?: string;
  equipmentPhotoUrl?: string;
  deliveredGallons?: number;
}

export interface PendingArrivalLocation {
  jobId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
}

const EMPTY_DRAFT: DeliveryDraft = { meterPhotoCaptured: false, equipmentPhotoCaptured: false };

const STATUS_RANK: Record<string, number> = {
  assigned: 0,
  started: 1,
  arrived: 2,
  equipment_verified: 3,
  fueled: 4,
  proof_submitted: 5,
  completed: 6,
};

const OFFLINE_CAPABLE_EVENTS = new Set([
  'job.arrived',
  'job.equipment_verified',
  'job.fueled',
  'job.proof_submitted',
  'delivery.completed',
]);

const STATUS_FROM_EVENT: Record<string, string> = {
  'job.arrived': 'arrived',
  'job.equipment_verified': 'equipment_verified',
  'job.fueled': 'fueled',
  'job.proof_submitted': 'proof_submitted',
  'delivery.completed': 'completed',
};

@Injectable({ providedIn: 'root' })
export class DriverStateService {
  constructor(
    private readonly api: DriverApiService,
    private readonly connectivity: ConnectivityService,
    private readonly store: OfflineStoreService,
    private readonly offlineSync: OfflineSyncService,
  ) {}

  readonly selectedJob = signal<DriverJob | null>(null);
  readonly selectedVehicleId = signal<string | null>(null);
  readonly meterConnected = signal(false);
  readonly verifiedEquipment = signal<DriverEquipment | null>(null);
  readonly deliveredGallons = signal(0);
  readonly deliveryDraft = signal<DeliveryDraft>(EMPTY_DRAFT);
  readonly busy = signal(false);
  readonly syncError = signal('');
  readonly syncWarnings = signal<Array<{ code: string; message: string }>>([]);
  readonly pendingArrivalLocation = signal<PendingArrivalLocation | null>(null);
  readonly lastSyncAt = signal<string | null>(null);
  readonly pendingSync = signal(false);
  readonly savedLocally = signal(false);

  async loadJob(jobId: string): Promise<DriverJob | null> {
    const local = await this.store.getLocalJob(jobId);
    if (this.connectivity.online()) {
      try {
        const serverJob = await firstValueFrom(this.api.getJob(jobId));
        const merged = this.mergeJob(serverJob, local);
        await this.cacheJob(merged, local?.syncStatus ?? 'synced', local?.vehicleId);
        this.selectedJob.set(merged);
        this.restoreDraft(jobId);
        if (!this.deliveredGallons() && merged.fueledGallons) this.deliveredGallons.set(merged.fueledGallons);
        this.pendingSync.set(local?.syncStatus === 'pending');
        return merged;
      } catch {
        if (local) {
          this.selectedJob.set(local.job);
          this.restoreDraft(jobId);
          this.pendingSync.set(local.syncStatus === 'pending');
          return local.job;
        }
        this.selectedJob.set(null);
        return null;
      }
    }
    if (local) {
      this.selectedJob.set(local.job);
      this.restoreDraft(jobId);
      this.pendingSync.set(local.syncStatus === 'pending');
      return local.job;
    }
    this.selectedJob.set(null);
    return null;
  }

  async mergeJobsWithLocal(serverJobs: DriverJob[]): Promise<DriverJob[]> {
    const localJobs = await this.store.getAllLocalJobs();
    const localMap = new Map(localJobs.map(record => [record.job.id, record]));
    const merged = serverJobs.map(job => {
      const local = localMap.get(job.id);
      return local ? this.mergeJob(job, local) : job;
    });
    for (const local of localJobs) {
      if (local.syncStatus === 'pending' && !serverJobs.some(job => job.id === local.job.id)) {
        merged.push(local.job);
      }
    }
    return merged;
  }

  async clockIn(note?: string, latitude?: number, longitude?: number, accuracyMeters?: number, confirmOutsideTerritory = false): Promise<boolean> {
    const shiftId = crypto.randomUUID();
    this.selectedVehicleId.set(null);
    return this.send('shift.clock_in', { vehicleId: null, note, latitude, longitude, accuracyMeters, confirmOutsideTerritory }, shiftId);
  }

  async clockOut(): Promise<boolean> {
    const shift = await this.fetchActiveShift();
    if (!(await this.send('shift.clock_out', {}, shift?.id))) return false;
    this.selectedVehicleId.set(null);
    return true;
  }

  async togglePause(paused: boolean): Promise<boolean> {
    const shift = await this.fetchActiveShift();
    if (!shift) return false;
    return this.send(paused ? 'shift.resume' : 'shift.pause', {}, shift.id);
  }

  connectMeter(): void {
    this.meterConnected.set(true);
  }

  async setVehicle(vehicleId: string): Promise<boolean> {
    const shift = await this.fetchActiveShift();
    if (!(await this.send('shift.vehicle_selected', { vehicleId }, shift?.id))) return false;
    this.selectedVehicleId.set(vehicleId);
    return true;
  }

  async lookupEquipment(qrCode: string): Promise<DriverEquipment> {
    const job = this.selectedJob();
    if (!job) throw new Error('No selected job.');
    const normalized = qrCode.trim();
    if (this.connectivity.online()) {
      const equipment = await firstValueFrom(this.api.lookupEquipment(job.id, normalized));
      this.verifiedEquipment.set(equipment);
      return equipment;
    }
    if (!job.equipmentQrCode || job.equipmentQrCode.toLowerCase() !== normalized.toLowerCase()) {
      throw new Error('Equipment not found. Scan a valid equipment QR code.');
    }
    const equipment: DriverEquipment = {
      id: job.equipmentId ?? job.id,
      customerId: '',
      customerName: job.customerName,
      siteId: '',
      siteName: job.siteName,
      siteAddress: job.siteAddress,
      name: job.equipmentName ?? 'Equipment',
      type: job.equipmentType ?? 'tank',
      capacityGallons: job.equipmentCapacityGallons,
      fuelType: job.fuelType,
      qrCode: job.equipmentQrCode,
      status: 'active',
    };
    this.verifiedEquipment.set(equipment);
    return equipment;
  }

  async submitInspection(
    jobId: string,
    vehicleId: string,
    checklist: Record<string, boolean>,
    notes?: string,
    photoUrls: string[] = [],
  ): Promise<boolean> {
    return this.send('inspection.submitted', {
      vehicleId,
      passed: Object.values(checklist).every(Boolean),
      checklist,
      notes,
      photoUrls,
    }, jobId);
  }

  async updateJob(jobId: string, action: 'started' | 'arrived' | 'equipment_verified' | 'fueled' | 'proof_submitted', payload: Record<string, unknown> = {}): Promise<boolean> {
    const job = this.selectedJob();
    const expected: Record<string, string> = {
      assigned: 'started',
      started: 'arrived',
      arrived: 'equipment_verified',
      equipment_verified: 'fueled',
      fueled: 'proof_submitted',
    };
    if (job && job.id === jobId) {
      if (job.status === action) return true;
      if (expected[job.status] !== action) {
        this.syncError.set(`Job cannot move from '${job.status}' to '${action}'.`);
        return false;
      }
    }
    const ok = await this.send(`job.${action}`, payload, jobId);
    if (!ok) return false;
    if (job && job.id === jobId) {
      const updated = { ...job, status: action };
      if (action === 'fueled' && payload['deliveredGallons']) {
        updated.fueledGallons = Number(payload['deliveredGallons']);
      }
      if (action === 'started' && payload['vehicleId']) {
        await this.cacheJob(updated, 'synced', payload['vehicleId'] as string);
      }
      this.selectedJob.set(updated);
    }
    return true;
  }

  setPendingArrivalLocation(location: PendingArrivalLocation): void {
    this.pendingArrivalLocation.set(location);
  }

  clearPendingArrivalLocation(jobId: string): void {
    if (this.pendingArrivalLocation()?.jobId === jobId) this.pendingArrivalLocation.set(null);
  }

  async completeDelivery(
    jobId: string,
    deliveredGallons: number,
    details: {
      startingTotalizer?: number;
      endingTotalizer?: number;
      meterTransactionId?: string;
      notes?: string;
      proof?: Record<string, unknown>;
    } = {},
  ): Promise<boolean> {
    const job = this.selectedJob();
    if (!job || job.id !== jobId || job.status !== 'proof_submitted') {
      this.syncError.set(`Job cannot move from '${job?.status ?? 'unknown'}' to 'completed'.`);
      return false;
    }
    const local = await this.store.getLocalJob(jobId);
    const vehicleId = this.selectedVehicleId()
      ?? local?.vehicleId
      ?? (await this.fetchActiveShift())?.vehicleId;
    const queued = await this.send('delivery.completed', {
      vehicleId,
      deliveredGallons,
      ...details,
    }, jobId, { flushImmediately: true });
    if (!queued) return false;

    this.deliveredGallons.set(deliveredGallons);
    const completed = { ...job, status: 'completed' };
    this.selectedJob.set(completed);
    await this.cacheJob(completed, this.pendingSync() ? 'pending' : 'synced', vehicleId ?? undefined);
    if (!this.pendingSync()) this.clearDraft(jobId);
    return true;
  }

  setDeliveryVolume(gallons: number): void {
    this.deliveredGallons.set(gallons);
    this.persistDraft({ ...this.deliveryDraft(), deliveredGallons: gallons });
  }

  setDeliveryProof(details: Omit<DeliveryDraft, 'deliveredGallons'>): void {
    const draft: DeliveryDraft = { ...details, deliveredGallons: this.deliveredGallons() };
    this.deliveryDraft.set(draft);
    this.persistDraft(draft);
  }

  async uploadEvidence(file: File, kind?: 'meter' | 'equipment'): Promise<string> {
    const jobId = this.selectedJob()?.id;
    if (!jobId) throw new Error('No selected job.');
    if (this.connectivity.online()) {
      return await firstValueFrom(this.api.uploadFile(file));
    }
    if (!kind) throw new Error('Photo kind is required for offline upload.');
    const id = crypto.randomUUID();
    await this.store.savePendingUpload({
      id,
      jobId,
      kind,
      fileName: file.name || `${kind}.jpg`,
      mimeType: file.type || 'image/jpeg',
      blob: file,
      createdAt: new Date().toISOString(),
    });
    return `${PENDING_UPLOAD_PREFIX}${id}`;
  }

  async resolvePhotoUrl(url: string | undefined): Promise<string> {
    if (!url || !isPendingUploadUrl(url)) return url ?? '';
    const upload = await this.store.getPendingUpload(pendingUploadId(url));
    if (!upload) return '';
    return URL.createObjectURL(upload.blob);
  }

  async deleteEvidence(url: string): Promise<void> {
    if (!url) return;
    if (isPendingUploadUrl(url)) {
      await this.store.deletePendingUpload(pendingUploadId(url));
      return;
    }
    if (this.connectivity.online()) {
      await firstValueFrom(this.api.deleteUploadedFile(url));
    }
  }

  async reportIncident(payload: {
    jobId?: string;
    incidentType: string;
    severity: string;
    description: string;
    supervisorContacted: boolean;
    latitude?: number;
    longitude?: number;
    evidenceUrls?: string[];
  }): Promise<boolean> {
    return this.send('incident.reported', payload, crypto.randomUUID());
  }

  vehicleDisplay(vehicle: DriverVehicle): string {
    return [vehicle.name, vehicle.make, vehicle.model].filter(Boolean).join(' · ');
  }

  isJobPendingSync(jobId: string): boolean {
    return this.offlineSync.pendingJobIds().includes(jobId);
  }

  private mergeJob(serverJob: DriverJob, local: LocalJobRecord | null): DriverJob {
    if (!local) return serverJob;
    const serverRank = STATUS_RANK[serverJob.status] ?? 0;
    const localRank = STATUS_RANK[local.job.status] ?? 0;
    if (local.syncStatus === 'pending' && localRank > serverRank) return local.job;
    return serverJob;
  }

  private async cacheJob(job: DriverJob, syncStatus: 'synced' | 'pending', vehicleId?: string): Promise<void> {
    const existing = await this.store.getLocalJob(job.id);
    await this.store.saveLocalJob({
      job,
      syncStatus,
      vehicleId: vehicleId ?? existing?.vehicleId,
      updatedAt: new Date().toISOString(),
    });
    if (syncStatus === 'pending') {
      this.pendingSync.set(true);
      await this.offlineSync.refreshPendingJobs();
    }
  }

  private async fetchActiveShift() {
    try {
      return await firstValueFrom(this.api.getActiveShift());
    } catch {
      return null;
    }
  }

  private draftStorageKey(jobId: string): string {
    return `driver_delivery_draft:${jobId}`;
  }

  private restoreDraft(jobId: string | null): void {
    const raw = jobId ? localStorage.getItem(this.draftStorageKey(jobId)) : null;
    const draft: DeliveryDraft = raw ? JSON.parse(raw) : EMPTY_DRAFT;
    this.deliveryDraft.set(draft);
    this.deliveredGallons.set(draft.deliveredGallons ?? 0);
  }

  private persistDraft(draft: DeliveryDraft): void {
    const jobId = this.selectedJob()?.id;
    if (!jobId) return;
    localStorage.setItem(this.draftStorageKey(jobId), JSON.stringify(draft));
  }

  private clearDraft(jobId: string): void {
    localStorage.removeItem(this.draftStorageKey(jobId));
  }

  private async send(
    eventType: string,
    payload: Record<string, unknown>,
    aggregateId?: string,
    options?: { flushImmediately?: boolean },
  ): Promise<boolean> {
    const offlineCapable = OFFLINE_CAPABLE_EVENTS.has(eventType);
    if (!offlineCapable && !this.connectivity.online()) {
      this.syncError.set('You are offline. Connect to the internet and try again.');
      return false;
    }

    const finalPayload = eventType === 'job.arrived' && !this.connectivity.online()
      ? { ...payload, confirmOutsideTerritory: true }
      : payload;

    const event: OfflineDriverEvent = {
      clientEventId: crypto.randomUUID(),
      eventType,
      aggregateId,
      occurredAt: new Date().toISOString(),
      payload: finalPayload,
    };

    if (offlineCapable) {
      await this.store.enqueueEvent(event);
      this.savedLocally.set(true);
      this.syncError.set('');
      const newStatus = STATUS_FROM_EVENT[eventType];
      if (newStatus && aggregateId) {
        const job = this.selectedJob();
        if (job && job.id === aggregateId) {
          const updated = { ...job, status: newStatus };
          if (eventType === 'job.fueled' && payload['deliveredGallons']) {
            updated.fueledGallons = Number(payload['deliveredGallons']);
          }
          await this.cacheJob(updated, 'pending', payload['vehicleId'] as string | undefined);
          this.selectedJob.set(updated);
        }
      }
    }

    if (!this.connectivity.online()) {
      this.pendingSync.set(true);
      await this.offlineSync.refreshPendingJobs();
      return offlineCapable;
    }

    this.busy.set(true);
    this.syncWarnings.set([]);
    try {
      if (offlineCapable && aggregateId) {
        const result = await this.offlineSync.flushJob(aggregateId);
        this.lastSyncAt.set(new Date().toISOString());
        this.syncWarnings.set(result.warnings.map(({ code, message }) => ({ code, message })));
        if (!result.success) {
          this.syncError.set(result.error ?? 'Sync failed. Your work is saved and will retry when online.');
          this.pendingSync.set(true);
          await this.offlineSync.refreshPendingJobs();
          if (this.offlineSync.isArrivalGeofenceError(result.error)) return false;
          return options?.flushImmediately ? offlineCapable : true;
        }
        this.pendingSync.set(false);
        this.savedLocally.set(false);
        this.syncError.set('');
        if (options?.flushImmediately && aggregateId) this.clearDraft(aggregateId);
        return true;
      }

      const result = await firstValueFrom(this.api.sync([event]));
      this.lastSyncAt.set(result.serverTime);
      this.syncWarnings.set((result.warnings ?? [])
        .filter(warning => warning.clientEventId === event.clientEventId)
        .map(({ code, message }) => ({ code, message })));
      this.syncError.set('');
      return true;
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string }; message?: string };
      const message = failure.error?.message ?? failure.message ?? 'The request could not be completed.';
      if (offlineCapable) {
        this.syncError.set('');
        this.pendingSync.set(true);
        await this.offlineSync.refreshPendingJobs();
        return true;
      }
      this.syncError.set(message);
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
