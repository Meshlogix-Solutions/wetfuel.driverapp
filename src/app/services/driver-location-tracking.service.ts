import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DriverApiService } from './driver-api.service';
import { DriverAuthService } from './driver-auth.service';
import { DriverCacheService } from './driver-cache.service';
import { ConnectivityService } from './connectivity.service';
import { DriverGeolocationService } from './driver-geolocation.service';

@Injectable({ providedIn: 'root' })
export class DriverLocationTrackingService {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly api: DriverApiService,
    private readonly auth: DriverAuthService,
    private readonly cache: DriverCacheService,
    private readonly connectivity: ConnectivityService,
    private readonly geo: DriverGeolocationService,
  ) {}

  start(): void {
    if (this.timerId) return;
    void this.captureAndReport();
    this.timerId = setInterval(() => void this.captureAndReport(), 15_000);
  }

  stop(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
  }

  private async captureAndReport(): Promise<void> {
    if (this.running || !this.auth.getCurrentUserId() || document.visibilityState === 'hidden') return;
    if (!this.connectivity.online()) return;
    this.running = true;
    try {
      const activeJob = this.cache.dashboardJobs()?.activeJob
        ?? this.cache.jobs().find(job => job.status === 'started')
        ?? null;
      if (activeJob?.status !== 'started') return;
      const position = await this.geo.getCurrentPosition();
      await firstValueFrom(this.api.recordLocation(
        activeJob.id,
        position.latitude,
        position.longitude,
        position.accuracyMeters,
      ));
    } catch {
      // Keep polling; a single failed GPS/API sample should not stop tracking.
    } finally {
      this.running = false;
    }
  }
}
