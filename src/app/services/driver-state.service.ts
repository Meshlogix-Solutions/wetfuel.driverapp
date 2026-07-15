import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DriverApiService,
  DriverBootstrap,
  DriverDelivery,
  DriverJob,
  DriverProfile,
  DriverVehicle,
  OfflineDriverEvent,
} from './driver-api.service';
import { ConnectivityService } from './connectivity.service';

const QUEUE_KEY = 'wetfuel_driver_event_queue';
const CACHE_KEY = 'wetfuel_driver_bootstrap';

@Injectable({ providedIn: 'root' })
export class DriverStateService {
  private readonly api = inject(DriverApiService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly queue = signal<OfflineDriverEvent[]>(this.readJson(QUEUE_KEY, []));
  private syncing = false;

  readonly profile = signal<DriverProfile | null>(null);
  readonly vehicles = signal<DriverVehicle[]>([]);
  readonly jobs = signal<DriverJob[]>([]);
  readonly selectedJobId = signal<string | null>(null);
  readonly selectedJob = computed(() =>
    this.jobs().find(job => job.id === this.selectedJobId())
      ?? this.jobs().find(job => !['completed', 'cancelled'].includes(job.status))
      ?? null);
  readonly recentDeliveries = signal<DriverDelivery[]>([]);
  readonly activeShift = signal<DriverBootstrap['activeShift']>(undefined);
  readonly shifts = signal<DriverBootstrap['shifts']>([]);
  readonly shiftActive = computed(() => !!this.activeShift());
  readonly paused = computed(() => this.activeShift()?.status === 'on_break');
  readonly selectedVehicleId = signal<string | null>(null);
  readonly selectedVehicle = computed(() => {
    const vehicle = this.vehicles().find(item => item.id === this.selectedVehicleId());
    return vehicle
      ? [vehicle.name, vehicle.make, vehicle.model].filter(Boolean).join(' · ')
      : 'No vehicle selected';
  });
  readonly meterConnected = signal(false);
  readonly deliveredGallons = signal(0);
  readonly syncPending = computed(() => this.queue().length);
  readonly initialized = signal(false);

  constructor() {
    const cached = this.readJson<DriverBootstrap | null>(CACHE_KEY, null);
    if (cached) this.applyBootstrap(cached);

    effect(() => {
      if (this.connectivity.online() && this.queue().length > 0) {
        void this.syncNow();
      }
    });
  }

  async initialize(): Promise<void> {
    if (!localStorage.getItem('driver_access_token')) {
      this.initialized.set(true);
      return;
    }
    try {
      await this.refresh();
    } catch {
      this.initialized.set(true);
    }
  }

  async refresh(): Promise<void> {
    try {
      const bootstrap = await firstValueFrom(this.api.bootstrap());
      localStorage.setItem(CACHE_KEY, JSON.stringify(bootstrap));
      this.applyBootstrap(bootstrap);
    } finally {
      this.initialized.set(true);
    }
  }

  clockIn(note?: string, latitude?: number, longitude?: number): void {
    const shiftId = crypto.randomUUID();
    this.activeShift.set({
      id: shiftId,
      status: 'clocked_in',
      vehicleId: this.selectedVehicleId() ?? undefined,
      startedAt: new Date().toISOString(),
      breakMinutes: 0,
    });
    this.enqueue('shift.clock_in', {
      vehicleId: this.selectedVehicleId(),
      note,
      latitude,
      longitude,
    }, shiftId);
  }

  clockOut(): void {
    this.enqueue('shift.clock_out', {}, this.activeShift()?.id);
    this.activeShift.set(undefined);
    this.selectedVehicleId.set(null);
  }

  togglePause(): void {
    const shift = this.activeShift();
    if (!shift) return;
    const nextStatus = shift.status === 'on_break' ? 'clocked_in' : 'on_break';
    this.activeShift.set({ ...shift, status: nextStatus });
    this.enqueue(nextStatus === 'on_break' ? 'shift.pause' : 'shift.resume', {}, shift.id);
  }

  connectMeter(): void {
    this.meterConnected.set(true);
  }

  setVehicle(vehicleName: string): void {
    const vehicle = this.vehicles().find(item =>
      item.name === vehicleName || this.vehicleDisplay(item) === vehicleName);
    if (!vehicle) return;
    this.selectedVehicleId.set(vehicle.id);
    const shift = this.activeShift();
    if (shift) this.activeShift.set({ ...shift, vehicleId: vehicle.id });
    this.enqueue('shift.vehicle_selected', { vehicleId: vehicle.id }, shift?.id);
  }

  selectJob(jobId: string): void {
    this.selectedJobId.set(jobId);
  }

  submitInspection(
    vehicleId: string,
    checklist: Record<string, boolean>,
    notes?: string,
    photoUrls: string[] = [],
  ): void {
    this.enqueue('inspection.submitted', {
      vehicleId,
      passed: Object.values(checklist).every(Boolean),
      checklist,
      notes,
      photoUrls,
    }, crypto.randomUUID());
  }

  updateJob(jobId: string, action: 'started' | 'arrived' | 'equipment_verified' | 'fueling' | 'proof_pending'): void {
    this.jobs.update(jobs => jobs.map(job =>
      job.id === jobId ? { ...job, status: action } : job));
    this.enqueue(`job.${action}`, {}, jobId);
  }

  completeDelivery(
    jobId: string,
    deliveredGallons: number,
    details: {
      startingTotalizer?: number;
      endingTotalizer?: number;
      meterTransactionId?: string;
      notes?: string;
      proof?: Record<string, unknown>;
    } = {},
  ): void {
    this.deliveredGallons.set(deliveredGallons);
    this.jobs.update(jobs => jobs.map(job =>
      job.id === jobId ? { ...job, status: 'completed' } : job));
    this.enqueue('delivery.completed', {
      vehicleId: this.selectedVehicleId(),
      deliveredGallons,
      ...details,
    }, jobId);
  }

  reportIncident(payload: {
    jobId?: string;
    incidentType: string;
    severity: string;
    description: string;
    latitude?: number;
    longitude?: number;
    evidenceUrls?: string[];
  }): void {
    this.enqueue('incident.reported', payload, crypto.randomUUID());
  }

  clearSync(): void {
    void this.syncNow();
  }

  async syncNow(): Promise<void> {
    if (this.syncing || !this.connectivity.online() || this.queue().length === 0) return;
    this.syncing = true;
    const batch = this.queue().slice(0, 200);
    let succeeded = false;
    try {
      const result = await firstValueFrom(this.api.sync(batch));
      const processed = new Set([
        ...result.acceptedEventIds,
        ...result.alreadyProcessedEventIds,
      ]);
      this.queue.update(events => events.filter(event => !processed.has(event.clientEventId)));
      this.persistQueue();
      await this.refresh();
      succeeded = true;
    } catch {
      // Keep every event queued. The next online transition/manual sync retries.
    } finally {
      this.syncing = false;
    }
    if (succeeded && this.queue().length > 0) {
      queueMicrotask(() => void this.syncNow());
    }
  }

  vehicleDisplay(vehicle: DriverVehicle): string {
    return [vehicle.name, vehicle.make, vehicle.model].filter(Boolean).join(' · ');
  }

  private enqueue(
    eventType: string,
    payload: Record<string, unknown>,
    aggregateId?: string,
  ): void {
    this.queue.update(events => [...events, {
      clientEventId: crypto.randomUUID(),
      eventType,
      aggregateId,
      occurredAt: new Date().toISOString(),
      payload,
    }]);
    this.persistQueue();
    if (this.connectivity.online()) void this.syncNow();
  }

  private applyBootstrap(bootstrap: DriverBootstrap): void {
    this.profile.set(bootstrap.profile);
    this.vehicles.set(bootstrap.vehicles);
    this.jobs.set(bootstrap.jobs);
    this.recentDeliveries.set(bootstrap.recentDeliveries);
    this.activeShift.set(bootstrap.activeShift);
    this.shifts.set(bootstrap.shifts);
    this.selectedVehicleId.set(
      bootstrap.activeShift?.vehicleId
        ?? bootstrap.profile.assignedVehicleId
        ?? null);
  }

  private persistQueue(): void {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue()));
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }
}
