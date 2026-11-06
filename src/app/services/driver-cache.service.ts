import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  DriverApiService,
  DriverComplianceDocument,
  DriverDashboardJobs,
  DriverDashboardSummary,
  DriverDelivery,
  DriverJob,
  DriverProfile,
  DriverShift,
  DriverVehicle,
} from './driver-api.service';
import { ConnectivityService } from './connectivity.service';
import { OfflineStoreService } from './offline-store.service';

@Injectable({ providedIn: 'root' })
export class DriverCacheService {
  readonly profile = signal<DriverProfile | null>(null);
  readonly jobs = signal<DriverJob[]>([]);
  readonly activeShift = signal<DriverShift | null>(null);
  readonly shifts = signal<DriverShift[]>([]);
  readonly vehicles = signal<DriverVehicle[]>([]);
  readonly deliveries = signal<DriverDelivery[]>([]);
  readonly dashboardSummary = signal<DriverDashboardSummary | null>(null);
  readonly dashboardJobs = signal<DriverDashboardJobs | null>(null);
  readonly documents = signal<DriverComplianceDocument[]>([]);
  readonly hydrated = signal(false);
  readonly hydrating = signal(false);
  readonly lastError = signal('');
  readonly lastHydratedAt = signal<string | null>(null);

  private hydratePromise: Promise<void> | null = null;
  private started = false;

  constructor(
    private readonly api: DriverApiService,
    private readonly store: OfflineStoreService,
    private readonly connectivity: ConnectivityService,
  ) {}

  /** Restore IndexedDB into signals, then refresh from network when online. */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.loadFromDisk().then(() => this.refreshIfOnline());
    this.connectivity.onChange(online => {
      if (online) void this.refreshIfOnline();
    });
  }

  async loadFromDisk(): Promise<void> {
    try {
      const [profile, jobs, shiftBundle, vehicles, deliveries, dashboard, documents, lastHydratedAt] = await Promise.all([
        this.store.getCacheProfile(),
        this.store.getCacheJobs(),
        this.store.getCacheShifts(),
        this.store.getCacheVehicles(),
        this.store.getCacheDeliveries(),
        this.store.getCacheDashboard(),
        this.store.getCacheDocuments(),
        this.store.getLastHydratedAt(),
      ]);

      if (profile) this.profile.set(profile);
      this.jobs.set(await this.mergeJobsWithPending(jobs));
      if (shiftBundle) {
        this.activeShift.set(shiftBundle.active);
        this.shifts.set(shiftBundle.shifts);
      }
      this.vehicles.set(vehicles);
      this.deliveries.set(deliveries);
      if (dashboard) {
        this.dashboardSummary.set(dashboard.summary);
        this.dashboardJobs.set(dashboard.jobs ? await this.mergeDashboardJobs(dashboard.jobs) : null);
      }
      this.documents.set(documents);
      this.lastHydratedAt.set(lastHydratedAt);

      const hasAny =
        !!profile
        || jobs.length > 0
        || !!shiftBundle
        || vehicles.length > 0
        || deliveries.length > 0
        || !!dashboard
        || documents.length > 0;
      this.hydrated.set(hasAny);
    } catch (error: unknown) {
      const failure = error as { message?: string };
      this.lastError.set(failure.message ?? 'Could not load offline cache.');
    }
  }

  async refreshIfOnline(): Promise<void> {
    if (!this.connectivity.online()) return;
    return this.hydrateAll();
  }

  async hydrateAll(): Promise<void> {
    if (!this.connectivity.online()) return;
    if (this.hydratePromise) return this.hydratePromise;
    this.hydratePromise = this.runHydrate().finally(() => { this.hydratePromise = null; });
    return this.hydratePromise;
  }

  /** Prefer pending local job over server row until flushed. */
  async mergeJobsWithPending(serverJobs: DriverJob[]): Promise<DriverJob[]> {
    const pending = await this.store.getPendingSyncJobs();
    const pendingMap = new Map(pending.map(record => [record.job.id, record]));
    const merged = serverJobs.map(job => {
      const local = pendingMap.get(job.id);
      if (!local) return job;
      pendingMap.delete(job.id);
      // Pending local workflow state wins until the job is flushed.
      return { ...job, ...local.job };
    });
    for (const leftover of pendingMap.values()) {
      merged.push(leftover.job);
    }
    return merged.sort(
      (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
    );
  }

  getJob(jobId: string): DriverJob | null {
    return this.jobs().find(job => job.id === jobId) ?? null;
  }

  async getJobAsync(jobId: string): Promise<DriverJob | null> {
    const cached = this.getJob(jobId);
    if (cached) return cached;
    const local = await this.store.getLocalJob(jobId);
    if (local) return local.job;
    if (!this.connectivity.online()) return null;
    try {
      const serverJob = await firstValueFrom(this.api.getJob(jobId));
      const jobs = await this.mergeJobsWithPending([
        ...this.jobs().filter(job => job.id !== jobId),
        serverJob,
      ]);
      this.jobs.set(jobs);
      await this.store.saveCacheJobs(jobs);
      return serverJob;
    } catch {
      return null;
    }
  }

  /** Update in-memory + disk cache after a local job mutation. */
  async upsertJob(job: DriverJob): Promise<void> {
    const jobs = [...this.jobs().filter(item => item.id !== job.id), job]
      .sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime());
    this.jobs.set(jobs);
    await this.store.saveCacheJobs(jobs);
    const dashboardJobs = this.dashboardJobs();
    if (dashboardJobs) {
      this.dashboardJobs.set(await this.mergeDashboardJobs(dashboardJobs));
    }
  }

  async setActiveShift(shift: DriverShift | null): Promise<void> {
    this.activeShift.set(shift);
    await this.store.saveCacheShifts(shift, this.shifts());
  }

  async setDocuments(documents: DriverComplianceDocument[]): Promise<void> {
    this.documents.set(documents);
    await this.store.saveCacheDocuments(documents);
  }

  private async runHydrate(): Promise<void> {
    this.hydrating.set(true);
    this.lastError.set('');
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    try {
      const results = await Promise.allSettled([
        firstValueFrom(this.api.getCurrentDriver()),
        firstValueFrom(this.api.getJobs()),
        firstValueFrom(this.api.getActiveShift()),
        firstValueFrom(this.api.getShifts()),
        firstValueFrom(this.api.getVehicles()),
        firstValueFrom(this.api.getRecentDeliveries()),
        firstValueFrom(this.api.getDashboardSummary(start, end)),
        firstValueFrom(this.api.getDashboardJobs()),
        firstValueFrom(this.api.getMyComplianceDocuments()),
      ]);

      const [profileR, jobsR, activeShiftR, shiftsR, vehiclesR, deliveriesR, summaryR, dashJobsR, docsR] = results;

      if (profileR.status === 'fulfilled') {
        this.profile.set(profileR.value);
        await this.store.saveCacheProfile(profileR.value);
      }
      if (jobsR.status === 'fulfilled') {
        const merged = await this.mergeJobsWithPending(jobsR.value);
        this.jobs.set(merged);
        await this.store.saveCacheJobs(merged);
      }
      const active = activeShiftR.status === 'fulfilled' ? activeShiftR.value : this.activeShift();
      const shifts = shiftsR.status === 'fulfilled' ? shiftsR.value : this.shifts();
      if (activeShiftR.status === 'fulfilled' || shiftsR.status === 'fulfilled') {
        this.activeShift.set(active);
        this.shifts.set(shifts);
        await this.store.saveCacheShifts(active, shifts);
      }
      if (vehiclesR.status === 'fulfilled') {
        this.vehicles.set(vehiclesR.value);
        await this.store.saveCacheVehicles(vehiclesR.value);
      }
      if (deliveriesR.status === 'fulfilled') {
        this.deliveries.set(deliveriesR.value);
        await this.store.saveCacheDeliveries(deliveriesR.value);
      }

      let summary = summaryR.status === 'fulfilled' ? summaryR.value : this.dashboardSummary();
      let dashJobs = dashJobsR.status === 'fulfilled' ? dashJobsR.value : this.dashboardJobs();
      if (dashJobs) dashJobs = await this.mergeDashboardJobs(dashJobs);
      if (summaryR.status === 'fulfilled' || dashJobsR.status === 'fulfilled') {
        this.dashboardSummary.set(summary);
        this.dashboardJobs.set(dashJobs);
        await this.store.saveCacheDashboard(summary, dashJobs, start.toISOString(), end.toISOString());
      }
      if (docsR.status === 'fulfilled') {
        this.documents.set(docsR.value);
        await this.store.saveCacheDocuments(docsR.value);
      }

      const hydratedAt = new Date().toISOString();
      this.lastHydratedAt.set(hydratedAt);
      this.hydrated.set(true);

      const failed = results.filter(result => result.status === 'rejected');
      if (failed.length === results.length) {
        const reason = (failed[0] as PromiseRejectedResult).reason as { error?: { message?: string }; message?: string } | undefined;
        this.lastError.set(reason?.error?.message ?? reason?.message ?? 'Cache refresh failed.');
      }
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string }; message?: string };
      this.lastError.set(failure.error?.message ?? failure.message ?? 'Cache refresh failed.');
    } finally {
      this.hydrating.set(false);
    }
  }

  private async mergeDashboardJobs(dashboard: DriverDashboardJobs): Promise<DriverDashboardJobs> {
    const jobs = this.jobs();
    const byId = new Map(jobs.map(job => [job.id, job]));
    const activeJob = dashboard.activeJob
      ? (byId.get(dashboard.activeJob.id) ?? dashboard.activeJob)
      : jobs.find(job => ['started', 'arrived', 'equipment_verified', 'fueled', 'proof_submitted'].includes(job.status)) ?? null;
    const nextJob = dashboard.nextJob
      ? (byId.get(dashboard.nextJob.id) ?? dashboard.nextJob)
      : jobs
        .filter(job => job.status === 'assigned')
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null;
    return {
      activeJob,
      nextJob,
      nextJobSequence: dashboard.nextJobSequence,
    };
  }
}
