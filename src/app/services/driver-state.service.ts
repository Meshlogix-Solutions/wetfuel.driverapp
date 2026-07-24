import { computed, inject, Injectable, signal } from '@angular/core';
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

// Online-only for now: every action calls the server immediately and awaits the result.
// Local state (job status, shift, etc.) only updates after the server confirms, so there's
// no optimistic state that can drift from what's actually saved, and no offline queue that
// can silently reject an action long after the driver has moved on.
@Injectable({ providedIn: 'root' })
export class DriverStateService {
  private readonly api = inject(DriverApiService);
  private readonly connectivity = inject(ConnectivityService);

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
  readonly busy = signal(false);
  readonly syncError = signal('');
  readonly lastSyncAt = signal<string | null>(null);
  readonly initialized = signal(false);

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
      this.applyBootstrap(bootstrap);
    } finally {
      this.initialized.set(true);
    }
  }

  async clockIn(note?: string, latitude?: number, longitude?: number): Promise<boolean> {
    const shiftId = crypto.randomUUID();
    if (!(await this.send('shift.clock_in', { vehicleId: this.selectedVehicleId(), note, latitude, longitude }, shiftId))) return false;
    this.activeShift.set({
      id: shiftId,
      status: 'clocked_in',
      vehicleId: this.selectedVehicleId() ?? undefined,
      startedAt: new Date().toISOString(),
      breakMinutes: 0,
      durationHours: 0,
    });
    return true;
  }

  async clockOut(): Promise<boolean> {
    const shiftId = this.activeShift()?.id;
    if (!(await this.send('shift.clock_out', {}, shiftId))) return false;
    this.activeShift.set(undefined);
    this.selectedVehicleId.set(null);
    return true;
  }

  async togglePause(): Promise<boolean> {
    const shift = this.activeShift();
    if (!shift) return false;
    const nextStatus = shift.status === 'on_break' ? 'clocked_in' : 'on_break';
    if (!(await this.send(nextStatus === 'on_break' ? 'shift.pause' : 'shift.resume', {}, shift.id))) return false;
    this.activeShift.set({ ...shift, status: nextStatus });
    return true;
  }

  connectMeter(): void {
    this.meterConnected.set(true);
  }

  async setVehicle(vehicleName: string): Promise<boolean> {
    const vehicle = this.vehicles().find(item =>
      item.name === vehicleName || this.vehicleDisplay(item) === vehicleName);
    if (!vehicle) return false;
    const shift = this.activeShift();
    if (!(await this.send('shift.vehicle_selected', { vehicleId: vehicle.id }, shift?.id))) return false;
    this.selectedVehicleId.set(vehicle.id);
    if (shift) this.activeShift.set({ ...shift, vehicleId: vehicle.id });
    return true;
  }

  selectJob(jobId: string): void {
    if (this.selectedJobId() === jobId) return;
    this.selectedJobId.set(jobId);
    this.verifiedEquipment.set(null);
  }

  async lookupEquipment(qrCode:string):Promise<DriverEquipment>{const job=this.selectedJob();if(!job)throw new Error('No selected job.');const equipment=await firstValueFrom(this.api.lookupEquipment(job.id,qrCode));this.verifiedEquipment.set(equipment);return equipment;}

  async submitInspection(
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
    }, crypto.randomUUID());
  }

  async updateJob(jobId: string, action: 'started' | 'arrived' | 'equipment_verified' | 'fueling' | 'proof_pending', payload: Record<string, unknown> = {}): Promise<boolean> {
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
    if (!job) {
      this.syncError.set(`Job cannot move from 'unknown' to '${action}'.`);
      return false;
    }
    // Re-entering delivery-proof to correct photos/totalizers after already reaching
    // proof_pending re-submits the same transition — that's a no-op, not an error.
    if (job.status === action) return true;
    if (expected[job.status] !== action) {
      this.syncError.set(`Job cannot move from '${job.status}' to '${action}'.`);
      return false;
    }
    if (!(await this.send(`job.${action}`, payload, jobId))) return false;
    this.jobs.update(jobs => jobs.map(j => j.id === jobId ? { ...j, status: action } : j));
    return true;
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
    const job = this.jobs().find(item => item.id === jobId);
    if (!job || job.status !== 'proof_pending') {
      this.syncError.set(`Job cannot move from '${job?.status ?? 'unknown'}' to 'completed'.`);
      return false;
    }
    if (!(await this.send('delivery.completed', {
      vehicleId: this.selectedVehicleId(),
      deliveredGallons,
      ...details,
    }, jobId))) return false;
    this.deliveredGallons.set(deliveredGallons);
    this.jobs.update(jobs => jobs.map(j => j.id === jobId ? { ...j, status: 'completed' } : j));
    return true;
  }

  setDeliveryVolume(gallons:number):void{this.deliveredGallons.set(gallons);}
  setDeliveryProof(details:{startingTotalizer?:number;endingTotalizer?:number;notes?:string;meterPhotoCaptured:boolean;equipmentPhotoCaptured:boolean;meterPhotoUrl?:string;equipmentPhotoUrl?:string}):void{this.deliveryDraft.set(details);}

  async uploadEvidence(file: File): Promise<string> {
    return await firstValueFrom(this.api.uploadFile(file));
  }

  async reportIncident(payload: {
    jobId?: string;
    incidentType: string;
    severity: string;
    description: string;
    latitude?: number;
    longitude?: number;
    evidenceUrls?: string[];
  }): Promise<boolean> {
    return this.send('incident.reported', payload, crypto.randomUUID());
  }

  vehicleDisplay(vehicle: DriverVehicle): string {
    return [vehicle.name, vehicle.make, vehicle.model].filter(Boolean).join(' · ');
  }

  /** Sends a single event to the server immediately and waits for confirmation.
   *  Returns false (and sets syncError) instead of throwing, so callers can just
   *  check the result rather than wrapping every call in try/catch. */
  private async send(eventType: string, payload: Record<string, unknown>, aggregateId?: string): Promise<boolean> {
    if (!this.connectivity.online()) {
      this.syncError.set('You are offline. Connect to the internet and try again.');
      return false;
    }
    const event: OfflineDriverEvent = {
      clientEventId: crypto.randomUUID(),
      eventType,
      aggregateId,
      occurredAt: new Date().toISOString(),
      payload,
    };
    this.busy.set(true);
    try {
      const result = await firstValueFrom(this.api.sync([event]));
      this.lastSyncAt.set(result.serverTime);
      this.syncError.set('');
      return true;
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string }; message?: string };
      this.syncError.set(failure.error?.message ?? failure.message ?? 'The request could not be completed.');
      return false;
    } finally {
      this.busy.set(false);
    }
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
      this.selectedJobId.set(this.jobs().find(job => !['completed','cancelled'].includes(job.status))?.id ?? null);
    }
  }
}
