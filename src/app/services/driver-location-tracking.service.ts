import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DriverApiService } from './driver-api.service';
import { DriverAuthService } from './driver-auth.service';
import { DriverGeolocationService } from './driver-geolocation.service';

@Injectable({ providedIn: 'root' })
export class DriverLocationTrackingService {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly api: DriverApiService,
    private readonly auth: DriverAuthService,
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
    this.running = true;
    try {
      const dashboard = await firstValueFrom(this.api.getDashboardJobs());
      if (dashboard.activeJob?.status !== 'started') return;
      const position = await this.geo.getCurrentPosition();
      await firstValueFrom(this.api.recordLocation(
        dashboard.activeJob.id,
        position.latitude,
        position.longitude,
        position.accuracyMeters,
      ));
    } catch {
      // Tracking is best-effort in the foreground. The next interval retries automatically.
    } finally {
      this.running = false;
    }
  }
}
