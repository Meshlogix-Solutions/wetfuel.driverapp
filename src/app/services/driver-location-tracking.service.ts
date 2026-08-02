import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DriverApiService } from './driver-api.service';
import { DriverAuthService } from './driver-auth.service';

@Injectable({ providedIn: 'root' })
export class DriverLocationTrackingService {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly api: DriverApiService,
    private readonly auth: DriverAuthService,
  ) {}

  start(): void {
    if (this.timerId || !navigator.geolocation) return;
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
      const position = await this.currentPosition();
      await firstValueFrom(this.api.recordLocation(
        dashboard.activeJob.id,
        position.coords.latitude,
        position.coords.longitude,
        position.coords.accuracy,
      ));
    } catch {
      // Tracking is best-effort in the foreground. The next interval retries automatically.
    } finally {
      this.running = false;
    }
  }

  private currentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 10_000 },
    ));
  }
}
