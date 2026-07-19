import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DriverApiService,
  DriverBootstrap,
  DriverDelivery,
  DriverEquipment,
  DriverJob,
  DriverProfile,
  DriverVehicle,
  OfflineDriverEvent,
} from './driver-api.service';
import { ConnectivityService } from './connectivity.service';
import { DriverOfflineDatabaseService } from './driver-offline-database.service';

@Injectable({ providedIn: 'root' })
export class DriverStateService {
  private readonly api = inject(DriverApiService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly offlineDatabase = inject(DriverOfflineDatabaseService);
  private readonly queue = signal<OfflineDriverEvent[]>([]);
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
  readonly verifiedEquipment = signal<DriverEquipment | null>(null);
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
  readonly deliveryDraft = signal<{startingTotalizer?:number;endingTotalizer?:number;notes?:string;meterPhotoCaptured:boolean;equipmentPhotoCaptured:boolean;meterPhotoUrl?:string;equipmentPhotoUrl?:string}>({meterPhotoCaptured:false,equipmentPhotoCaptured:false});
  readonly syncPending = computed(() => this.queue().length);
  readonly syncInProgress = signal(false);
  readonly syncError = signal('');
  readonly lastSyncAt = signal<string | null>(null);
  readonly initialized = signal(false);

  constructor() {
    effect(() => {
      if (localStorage.getItem('driver_access_token') && this.connectivity.online() && this.queue().length > 0) {
        void this.syncNow();
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.offlineDatabase.initialize();
      this.queue.set(await this.offlineDatabase.listPendingEvents());
      this.selectedJobId.set(await this.offlineDatabase.getState<string>('selected_job_id'));
      const cached = await this.offlineDatabase.getState<DriverBootstrap>('bootstrap');
      if (cached) this.applyBootstrap(cached);
      this.lastSyncAt.set(await this.offlineDatabase.getState<string>('last_sync_at'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Offline database initialization failed.';
      this.syncError.set(`Offline storage unavailable: ${message}`);
    }
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
      if (this.offlineDatabase.available) {
        await this.offlineDatabase.setState('bootstrap', bootstrap);
      }
      this.applyBootstrap(bootstrap);
      if (this.queue().length > 0 && this.connectivity.online()) {
        queueMicrotask(() => void this.syncNow());
      }
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
      durationHours: 0,
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
    if (this.selectedJobId() === jobId) return;
    this.selectedJobId.set(jobId);
    if (this.offlineDatabase.available) {
      void this.offlineDatabase.setState('selected_job_id', jobId);
    }
    this.verifiedEquipment.set(null);
  }

  async lookupEquipment(qrCode:string):Promise<DriverEquipment>{const job=this.selectedJob();if(!job)throw new Error('No selected job.');const equipment=await firstValueFrom(this.api.lookupEquipment(job.id,qrCode));this.verifiedEquipment.set(equipment);return equipment;}

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

  updateJob(jobId: string, action: 'started' | 'arrived' | 'equipment_verified' | 'fueling' | 'proof_pending', payload: Record<string, unknown> = {}): boolean {
    const job = this.jobs().find(item => item.id === jobId);
    const expected: Record<string, string> = {
      assigned: 'started',
      started: 'arrived',
      arrived: 'equipment_verified',
      equipment_verified: 'fueling',
      fueling: 'proof_pending',
    };
    if (action === 'started' && (!this.activeShift() || !this.selectedVehicleId())) {
      this.syncError.set('Clock in and select the delivery vehicle before starting a job.');
      return false;
    }
    if (!job || expected[job.status] !== action) {
      this.syncError.set(`Job cannot move from '${job?.status ?? 'unknown'}' to '${action}'.`);
      return false;
    }
    if (this.syncError() && this.connectivity.online()) return false;
    this.jobs.update(jobs => jobs.map(job =>
      job.id === jobId ? { ...job, status: action } : job));
    this.enqueue(`job.${action}`, payload, jobId);
    return true;
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
    const job = this.jobs().find(item => item.id === jobId);
    if (!job || job.status !== 'proof_pending') {
      this.syncError.set(`Job cannot move from '${job?.status ?? 'unknown'}' to 'completed'.`);
      return;
    }
    this.deliveredGallons.set(deliveredGallons);
    this.jobs.update(jobs => jobs.map(job =>
      job.id === jobId ? { ...job, status: 'completed' } : job));
    this.enqueue('delivery.completed', {
      vehicleId: this.selectedVehicleId(),
      deliveredGallons,
      ...details,
    }, jobId);
  }

  setDeliveryVolume(gallons:number):void{this.deliveredGallons.set(gallons);}
  setDeliveryProof(details:{startingTotalizer?:number;endingTotalizer?:number;notes?:string;meterPhotoCaptured:boolean;equipmentPhotoCaptured:boolean;meterPhotoUrl?:string;equipmentPhotoUrl?:string}):void{this.deliveryDraft.set(details);}

  async uploadEvidence(file: File): Promise<string> {
    return await firstValueFrom(this.api.uploadFile(file));
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
    this.syncInProgress.set(true);
    const batch = this.queue().slice(0, 200);
    let succeeded = false;
    try {
      const result = await firstValueFrom(this.api.sync(batch));
      const processed = new Set([
        ...result.acceptedEventIds,
        ...result.alreadyProcessedEventIds,
      ]);
      this.queue.update(events => events.filter(event => !processed.has(event.clientEventId)));
      await this.offlineDatabase.deleteEvents([...processed]);
      await this.refresh();
      this.syncError.set('');
      this.lastSyncAt.set(result.serverTime);
      await this.offlineDatabase.setState('last_sync_at', result.serverTime);
      succeeded = true;
    } catch (error: unknown) {
      // Keep every event queued. The next online transition/manual sync retries.
      const failure = error as { error?: { message?: string }; message?: string };
      const message = failure.error?.message ?? failure.message ?? 'Driver activity could not be synchronized.';
      await this.offlineDatabase.markFailed(batch.map(event => event.clientEventId), message);
      if (await this.reconcileInvalidJobTransition(message)) {
        this.syncError.set('An out-of-sequence job action was removed. Open the job and continue from its current server status.');
        try { await this.refresh(); } catch { /* Keep cached state available if refresh fails. */ }
      } else {
        this.syncError.set(message);
      }
    } finally {
      this.syncing = false;
      this.syncInProgress.set(false);
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
    const event: OfflineDriverEvent = {
      clientEventId: crypto.randomUUID(),
      eventType,
      aggregateId,
      occurredAt: new Date().toISOString(),
      payload,
    };
    void this.offlineDatabase.addEvent(event).then(() => {
      this.queue.update(events => [...events, event]);
      if (this.connectivity.online()) void this.syncNow();
    }).catch(error => {
      this.syncError.set(error instanceof Error ? error.message : 'Offline activity could not be saved.');
    });
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
    if (!this.jobs().some(job => job.id === this.selectedJobId() && !['completed','cancelled'].includes(job.status))) {
      const selected = this.jobs().find(job => !['completed','cancelled'].includes(job.status))?.id ?? null;
      this.selectedJobId.set(selected);
      if (this.offlineDatabase.available) {
        void this.offlineDatabase.setState('selected_job_id', selected);
      }
    }
  }

  private async reconcileInvalidJobTransition(message: string): Promise<boolean> {
    const match = message.match(/Job cannot move from '([^']+)' to '([^']+)'/i);
    if (!match) return false;
    const nextStatus = match[2].toLowerCase();
    const eventType = nextStatus === 'completed' ? 'delivery.completed' : `job.${nextStatus}`;
    const invalid = this.queue().find(event => event.eventType.toLowerCase() === eventType);
    if (!invalid?.aggregateId) return false;

    const workflowEvents = new Set([
      'job.started', 'job.arrived', 'job.equipment_verified',
      'job.fueling', 'job.proof_pending', 'delivery.completed',
    ]);
    const invalidIndex = this.queue().findIndex(event => event.clientEventId === invalid.clientEventId);
    const removedIds = this.queue().filter((event, index) =>
      event.aggregateId === invalid.aggregateId
      && workflowEvents.has(event.eventType.toLowerCase())
      && index >= invalidIndex).map(event => event.clientEventId);
    this.queue.update(events => events.filter((event, index) =>
      event.aggregateId !== invalid.aggregateId
      || !workflowEvents.has(event.eventType.toLowerCase())
      || index < invalidIndex));
    await this.offlineDatabase.deleteEvents(removedIds);
    return true;
  }
}
