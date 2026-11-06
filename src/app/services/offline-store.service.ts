import { Injectable } from '@angular/core';
import {
  DriverComplianceDocument,
  DriverDashboardJobs,
  DriverDashboardSummary,
  DriverDelivery,
  DriverJob,
  DriverProfile,
  DriverShift,
  DriverVehicle,
  OfflineDriverEvent,
} from './driver-api.service';

export type JobSyncStatus = 'synced' | 'pending';

export interface LocalJobRecord {
  job: DriverJob;
  syncStatus: JobSyncStatus;
  vehicleId?: string;
  updatedAt: string;
}

export interface QueuedDriverEvent extends OfflineDriverEvent {
  synced: boolean;
}

export interface PendingUpload {
  id: string;
  jobId: string;
  kind: 'meter' | 'equipment';
  fileName: string;
  mimeType: string;
  blob: Blob;
  createdAt: string;
}

export interface CacheMeta {
  key: string;
  updatedAt: string;
}

export interface CachedDashboard {
  id: 'current';
  summary: DriverDashboardSummary | null;
  jobs: DriverDashboardJobs | null;
  summaryStart?: string;
  summaryEnd?: string;
}

export interface CachedShiftBundle {
  id: 'current';
  active: DriverShift | null;
  shifts: DriverShift[];
}

export interface CachedProfile {
  id: 'current';
  profile: DriverProfile;
}

export interface CachedJobRow {
  id: string;
  job: DriverJob;
}

export interface CachedVehicleRow {
  id: string;
  vehicle: DriverVehicle;
}

export interface CachedDeliveryRow {
  id: string;
  delivery: DriverDelivery;
}

export interface CachedDocumentRow {
  id: string;
  document: DriverComplianceDocument;
}

const DB_NAME = 'wetfuel-driver-offline';
const DB_VERSION = 2;

@Injectable({ providedIn: 'root' })
export class OfflineStoreService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  async enqueueEvent(event: OfflineDriverEvent): Promise<void> {
    const queued: QueuedDriverEvent = { ...event, synced: false };
    await this.put('pending_events', queued);
  }

  async getUnsyncedEventsForJob(jobId: string): Promise<QueuedDriverEvent[]> {
    const events = await this.getAllByIndex<QueuedDriverEvent>('pending_events', 'aggregateId', jobId);
    return events.filter(event => !event.synced).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  async getAllUnsyncedEvents(): Promise<QueuedDriverEvent[]> {
    const events = await this.getAll<QueuedDriverEvent>('pending_events');
    return events.filter(event => !event.synced).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  async markEventsSynced(clientEventIds: string[]): Promise<void> {
    if (!clientEventIds.length) return;
    const idSet = new Set(clientEventIds);
    const events = await this.getAll<QueuedDriverEvent>('pending_events');
    await Promise.all(events
      .filter(event => idSet.has(event.clientEventId))
      .map(event => this.put('pending_events', { ...event, synced: true })));
  }

  async updateEventPayload(clientEventId: string, payload: Record<string, unknown>): Promise<void> {
    const event = await this.get<QueuedDriverEvent>('pending_events', clientEventId);
    if (!event) return;
    await this.put('pending_events', { ...event, payload });
  }

  async saveLocalJob(record: LocalJobRecord): Promise<void> {
    await this.put('local_jobs', { ...record, id: record.job.id });
  }

  async getLocalJob(jobId: string): Promise<LocalJobRecord | null> {
    const row = await this.get<LocalJobRecord & { id: string }>('local_jobs', jobId);
    if (!row) return null;
    const { id: _id, ...record } = row;
    return record;
  }

  async getAllLocalJobs(): Promise<LocalJobRecord[]> {
    const rows = await this.getAll<LocalJobRecord & { id: string }>('local_jobs');
    return rows.map(({ id: _id, ...record }) => record);
  }

  async getPendingSyncJobs(): Promise<LocalJobRecord[]> {
    const jobs = await this.getAllLocalJobs();
    return jobs.filter(job => job.syncStatus === 'pending');
  }

  async getPendingSyncJobIds(): Promise<string[]> {
    return (await this.getPendingSyncJobs()).map(job => job.job.id);
  }

  async savePendingUpload(upload: PendingUpload): Promise<void> {
    await this.put('pending_uploads', upload);
  }

  async getPendingUpload(id: string): Promise<PendingUpload | null> {
    return this.get<PendingUpload>('pending_uploads', id);
  }

  async getPendingUploadsForJob(jobId: string): Promise<PendingUpload[]> {
    return this.getAllByIndex<PendingUpload>('pending_uploads', 'jobId', jobId);
  }

  async deletePendingUpload(id: string): Promise<void> {
    await this.delete('pending_uploads', id);
  }

  async clearSyncedEventsForJob(jobId: string): Promise<void> {
    const events = await this.getAllByIndex<QueuedDriverEvent>('pending_events', 'aggregateId', jobId);
    await Promise.all(events.filter(event => event.synced).map(event => this.delete('pending_events', event.clientEventId)));
  }

  async saveCacheProfile(profile: DriverProfile): Promise<void> {
    await this.put<CachedProfile>('cache_profile', { id: 'current', profile });
    await this.touchMeta('profile');
  }

  async getCacheProfile(): Promise<DriverProfile | null> {
    const row = await this.get<CachedProfile>('cache_profile', 'current');
    return row?.profile ?? null;
  }

  async saveCacheJobs(jobs: DriverJob[]): Promise<void> {
    const existing = await this.getAll<CachedJobRow>('cache_jobs');
    await Promise.all(existing.map(row => this.delete('cache_jobs', row.id)));
    await Promise.all(jobs.map(job => this.put<CachedJobRow>('cache_jobs', { id: job.id, job })));
    await this.touchMeta('jobs');
  }

  async getCacheJobs(): Promise<DriverJob[]> {
    const rows = await this.getAll<CachedJobRow>('cache_jobs');
    return rows.map(row => row.job);
  }

  async saveCacheShifts(active: DriverShift | null, shifts: DriverShift[]): Promise<void> {
    await this.put<CachedShiftBundle>('cache_shift', { id: 'current', active, shifts });
    await this.touchMeta('shifts');
  }

  async getCacheShifts(): Promise<CachedShiftBundle | null> {
    return this.get<CachedShiftBundle>('cache_shift', 'current');
  }

  async saveCacheVehicles(vehicles: DriverVehicle[]): Promise<void> {
    const existing = await this.getAll<CachedVehicleRow>('cache_vehicles');
    await Promise.all(existing.map(row => this.delete('cache_vehicles', row.id)));
    await Promise.all(vehicles.map(vehicle => this.put<CachedVehicleRow>('cache_vehicles', { id: vehicle.id, vehicle })));
    await this.touchMeta('vehicles');
  }

  async getCacheVehicles(): Promise<DriverVehicle[]> {
    const rows = await this.getAll<CachedVehicleRow>('cache_vehicles');
    return rows.map(row => row.vehicle);
  }

  async saveCacheDeliveries(deliveries: DriverDelivery[]): Promise<void> {
    const existing = await this.getAll<CachedDeliveryRow>('cache_deliveries');
    await Promise.all(existing.map(row => this.delete('cache_deliveries', row.id)));
    await Promise.all(deliveries.map(delivery => this.put<CachedDeliveryRow>('cache_deliveries', { id: delivery.id, delivery })));
    await this.touchMeta('deliveries');
  }

  async getCacheDeliveries(): Promise<DriverDelivery[]> {
    const rows = await this.getAll<CachedDeliveryRow>('cache_deliveries');
    return rows.map(row => row.delivery);
  }

  async saveCacheDashboard(
    summary: DriverDashboardSummary | null,
    jobs: DriverDashboardJobs | null,
    summaryStart?: string,
    summaryEnd?: string,
  ): Promise<void> {
    await this.put<CachedDashboard>('cache_dashboard', {
      id: 'current',
      summary,
      jobs,
      summaryStart,
      summaryEnd,
    });
    await this.touchMeta('dashboard');
  }

  async getCacheDashboard(): Promise<CachedDashboard | null> {
    return this.get<CachedDashboard>('cache_dashboard', 'current');
  }

  async saveCacheDocuments(documents: DriverComplianceDocument[]): Promise<void> {
    const existing = await this.getAll<CachedDocumentRow>('cache_documents');
    await Promise.all(existing.map(row => this.delete('cache_documents', row.id)));
    await Promise.all(documents.map(document => this.put<CachedDocumentRow>('cache_documents', { id: document.id, document })));
    await this.touchMeta('documents');
  }

  async getCacheDocuments(): Promise<DriverComplianceDocument[]> {
    const rows = await this.getAll<CachedDocumentRow>('cache_documents');
    return rows.map(row => row.document);
  }

  async getCacheMeta(key: string): Promise<CacheMeta | null> {
    return this.get<CacheMeta>('cache_meta', key);
  }

  async getLastHydratedAt(): Promise<string | null> {
    return (await this.getCacheMeta('lastHydratedAt'))?.updatedAt ?? null;
  }

  private async touchMeta(key: string): Promise<void> {
    const now = new Date().toISOString();
    await this.put<CacheMeta>('cache_meta', { key, updatedAt: now });
    await this.put<CacheMeta>('cache_meta', { key: 'lastHydratedAt', updatedAt: now });
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('pending_events')) {
          const store = db.createObjectStore('pending_events', { keyPath: 'clientEventId' });
          store.createIndex('aggregateId', 'aggregateId', { unique: false });
        }
        if (!db.objectStoreNames.contains('local_jobs')) {
          db.createObjectStore('local_jobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending_uploads')) {
          const store = db.createObjectStore('pending_uploads', { keyPath: 'id' });
          store.createIndex('jobId', 'jobId', { unique: false });
        }
        if (!db.objectStoreNames.contains('cache_profile')) {
          db.createObjectStore('cache_profile', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache_jobs')) {
          db.createObjectStore('cache_jobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache_shift')) {
          db.createObjectStore('cache_shift', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache_vehicles')) {
          db.createObjectStore('cache_vehicles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache_deliveries')) {
          db.createObjectStore('cache_deliveries', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache_dashboard')) {
          db.createObjectStore('cache_dashboard', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache_documents')) {
          db.createObjectStore('cache_documents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache_meta')) {
          db.createObjectStore('cache_meta', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
    return this.dbPromise;
  }

  private async put<T>(storeName: string, value: T): Promise<void> {
    await this.openDb();
    await this.runTransaction(storeName, 'readwrite', store => store.put(value));
  }

  private async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    await this.openDb();
    return this.runTransaction(storeName, 'readonly', store => store.get(key)) as Promise<T | null>;
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    await this.openDb();
    return this.runTransaction(storeName, 'readonly', store => store.getAll()) as Promise<T[]>;
  }

  private async getAllByIndex<T>(storeName: string, indexName: string, key: IDBValidKey): Promise<T[]> {
    await this.openDb();
    return this.runTransaction(storeName, 'readonly', store => store.index(indexName).getAll(key)) as Promise<T[]>;
  }

  private async delete(storeName: string, key: IDBValidKey): Promise<void> {
    await this.openDb();
    await this.runTransaction(storeName, 'readwrite', store => store.delete(key));
  }

  private runTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return this.openDb().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error ?? new Error(`IndexedDB ${storeName} operation failed`));
    }));
  }
}

export const PENDING_UPLOAD_PREFIX = 'pending://';

export function isPendingUploadUrl(url: string | undefined): boolean {
  return !!url?.startsWith(PENDING_UPLOAD_PREFIX);
}

export function pendingUploadId(url: string): string {
  return url.slice(PENDING_UPLOAD_PREFIX.length);
}
