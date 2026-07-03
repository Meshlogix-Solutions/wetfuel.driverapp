import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DriverStateService {
  readonly shiftActive = signal(false);
  readonly paused = signal(false);
  readonly selectedVehicle = signal('Truck 14 · Ford F-750');
  readonly meterConnected = signal(false);
  readonly deliveredGallons = signal(186);
  readonly syncPending = signal(3);

  clockIn(): void { this.shiftActive.set(true); }
  clockOut(): void { this.shiftActive.set(false); this.paused.set(false); }
  togglePause(): void { this.paused.update(value => !value); }
  connectMeter(): void { this.meterConnected.set(true); }
  setVehicle(vehicle: string): void { this.selectedVehicle.set(vehicle); }
  clearSync(): void { this.syncPending.set(0); }
}
