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

const EMPTY_DRAFT: DeliveryDraft = { meterPhotoCaptured: false, equipmentPhotoCaptured: false };

// Every screen fetches exactly the data it needs itself (via DriverApiService) instead of
// one bootstrap-everything call. This service is left holding only two kinds of things:
// (1) plain action/mutation passthroughs to the server, and (2) small bits of state that
// genuinely span multiple screens mid-workflow (the job currently open, the vehicle picked
// during today's clock-in flow, in-progress delivery-proof entries) - not cached copies of
// server data that belongs to one particular page.
@Injectable({ providedIn: 'root' })
export class DriverStateService {
  constructor(
    private readonly api: DriverApiService,
    private readonly connectivity: ConnectivityService,
  ) {}

  readonly selectedJob = signal<DriverJob | null>(null);
  readonly selectedVehicleId = signal<string | null>(null);
  readonly meterConnected = signal(false);
  readonly verifiedEquipment = signal<DriverEquipment | null>(null);
  readonly deliveredGallons = signal(0);
  readonly deliveryDraft = signal<DeliveryDraft>(EMPTY_DRAFT);
  readonly busy = signal(false);
  readonly syncError = signal('');
  readonly lastSyncAt = signal<string | null>(null);

  /** Fetches just this one job and makes it the current workflow job - the guard calls
   *  this on every /jobs/:jobId navigation, so it's always fresh for whichever job the
   *  driver is actually looking at. */
  async loadJob(jobId: string): Promise<DriverJob | null> {
    try {
      const job = await firstValueFrom(this.api.getJob(jobId));
      this.selectedJob.set(job);
      this.restoreDraft(jobId);
      return job;
    } catch {
      this.selectedJob.set(null);
      return null;
    }
  }

  async clockIn(note?: string, latitude?: number, longitude?: number): Promise<boolean> {
    const shiftId = crypto.randomUUID();
    return this.send('shift.clock_in', { vehicleId: this.selectedVehicleId(), note, latitude, longitude }, shiftId);
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
    const equipment = await firstValueFrom(this.api.lookupEquipment(job.id, qrCode));
    this.verifiedEquipment.set(equipment);
    return equipment;
  }

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
      // Re-entering delivery-proof to correct photos/totalizers after already reaching
      // proof_submitted re-submits the same transition - that's a no-op, not an error.
      if (job.status === action) return true;
      if (expected[job.status] !== action) {
        this.syncError.set(`Job cannot move from '${job.status}' to '${action}'.`);
        return false;
      }
    }
    // Shift/vehicle prerequisites for 'started' are validated server-side (see
    // SyncDriverAppEventsCommandHandler) - there's no reliable local cache of that to
    // pre-check against a job opened fresh this session, so let the server's error surface.
    if (!(await this.send(`job.${action}`, payload, jobId))) return false;
    if (job && job.id === jobId) this.selectedJob.set({ ...job, status: action });
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
    const job = this.selectedJob();
    if (!job || job.id !== jobId || job.status !== 'proof_submitted') {
      this.syncError.set(`Job cannot move from '${job?.status ?? 'unknown'}' to 'completed'.`);
      return false;
    }
    // The truck's inventory decrement on the server needs a real vehicleId - selectedVehicleId
    // is only populated by this session's own clock-in/vehicle-select flow, so fall back to
    // asking the server which vehicle is actually on the open shift (e.g. after an app restart
    // mid-shift, where nothing in this session ever set selectedVehicleId).
    const vehicleId = this.selectedVehicleId() ?? (await this.fetchActiveShift())?.vehicleId;
    if (!(await this.send('delivery.completed', {
      vehicleId,
      deliveredGallons,
      ...details,
    }, jobId))) return false;
    this.deliveredGallons.set(deliveredGallons);
    this.selectedJob.set({ ...job, status: 'completed' });
    this.clearDraft(jobId);
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

  private async fetchActiveShift() {
    try {
      return await firstValueFrom(this.api.getActiveShift());
    } catch {
      return null;
    }
  }

  // Delivery-proof photos/totalizers/notes are entered over several steps and screens - without
  // persisting past just the in-memory signal, a reload (or the OS backgrounding/killing the
  // PWA) wipes already-uploaded photos from the UI even though the files are still on the
  // server, and forces the driver to redo the whole proof step. Key by job id so drivers with
  // multiple jobs don't see one job's draft bleed into another's.
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
}
