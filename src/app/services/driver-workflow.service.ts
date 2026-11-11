import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { DriverShift, DriverVehicle } from './driver-api.service';
import { DriverCacheService } from './driver-cache.service';
import { ConnectivityService } from './connectivity.service';
import { DriverGeolocationService } from './driver-geolocation.service';
import { DriverStateService } from './driver-state.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class DriverWorkflowService {
  private readonly cache = inject(DriverCacheService);
  private readonly connectivity = inject(ConnectivityService);
  private readonly state = inject(DriverStateService);
  private readonly geo = inject(DriverGeolocationService);
  private readonly alerts = inject(AlertController);
  private readonly toast = inject(ToastService);

  async getActiveShift(): Promise<DriverShift | null> {
    if (this.connectivity.online()) {
      await this.cache.refreshIfOnline();
    }
    return this.cache.activeShift();
  }

  async startShift(): Promise<boolean> {
    const existing = await this.getActiveShift();
    if (existing) return true;
    if (!this.connectivity.online() && !this.cache.hydrated()) {
      void this.toast.error('The active shift could not be verified. Check your connection and try again.');
      return false;
    }
    const location = await this.captureLocation();
    let started = await this.state.clockIn(undefined, location?.latitude, location?.longitude, location?.accuracyMeters);
    if (!started && this.state.syncError().includes('not on the depot site yet')) {
      const alert = await this.alerts.create({
        header: 'Outside depot site',
        message: 'You are not on the depot site yet. Do you still want to clock in?',
        buttons: [{ text:'Not yet', role:'cancel' }, { text:'Clock in anyway', role:'confirm' }],
      });
      await alert.present();
      const result = await alert.onDidDismiss();
      if (result.role !== 'confirm') {
        this.state.syncError.set('');
        return false;
      }
      started = await this.state.clockIn(undefined, location?.latitude, location?.longitude, location?.accuracyMeters, true);
    }
    if (started) {
      const warning = this.state.syncWarnings()[0];
      if (warning) void this.toast.warning(warning.message);
      await this.cache.refreshIfOnline();
    }
    if (!started) {
      const again = await this.getActiveShift();
      if (again) {
        this.state.syncError.set('');
        return true;
      }
      void this.toast.error(this.state.consumeSyncError('The shift could not be started.'));
    }
    return started;
  }

  private async captureLocation(): Promise<{ latitude:number; longitude:number; accuracyMeters:number } | null> {
    try {
      return await this.geo.getCurrentPosition();
    } catch {
      return null;
    }
  }

  async selectAssignedVehicle(): Promise<boolean> {
    if (this.connectivity.online()) {
      await this.cache.refreshIfOnline();
    }
    const vehicles: DriverVehicle[] = this.cache.vehicles();
    if (vehicles.length === 0) {
      void this.toast.error(this.connectivity.online()
        ? 'No active vehicle is assigned to your driver account.'
        : 'Assigned vehicles are not available offline yet. Connect once to sync.');
      return false;
    }

    let vehicleId = vehicles[0].id;
    if (vehicles.length > 1) {
      const alert = await this.alerts.create({
        header: 'Select a vehicle',
        message: 'Choose the vehicle you are operating for this shift.',
        inputs: vehicles.map((vehicle, index) => ({
          type: 'radio' as const,
          label: this.vehicleLabel(vehicle),
          value: vehicle.id,
          checked: index === 0,
        })),
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Select vehicle', role: 'confirm' },
        ],
      });
      await alert.present();
      const result = await alert.onDidDismiss<{ values?: string }>();
      if (result.role !== 'confirm') return false;
      vehicleId = result.data?.values ?? vehicleId;
    }

    const selected = await this.state.setVehicle(vehicleId);
    if (!selected) void this.toast.error(this.state.consumeSyncError('The vehicle could not be selected.'));
    else await this.cache.refreshIfOnline();
    return selected;
  }

  private vehicleLabel(vehicle: DriverVehicle): string {
    return `${vehicle.unitNumber} · ${[vehicle.name, vehicle.make, vehicle.model].filter(Boolean).join(' · ')}`;
  }
}
