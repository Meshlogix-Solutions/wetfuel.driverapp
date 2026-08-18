import { Injectable, inject } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { DriverApiService, DriverShift, DriverVehicle } from './driver-api.service';
import { DriverGeolocationService } from './driver-geolocation.service';
import { DriverStateService } from './driver-state.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class DriverWorkflowService {
  private readonly api = inject(DriverApiService);
  private readonly state = inject(DriverStateService);
  private readonly geo = inject(DriverGeolocationService);
  private readonly alerts = inject(AlertController);
  private readonly toast = inject(ToastService);

  async getActiveShift(): Promise<DriverShift | null> {
    try {
      return await firstValueFrom(this.api.getActiveShift());
    } catch {
      return null;
    }
  }

  async startShift(): Promise<boolean> {
    try {
      if (await firstValueFrom(this.api.getActiveShift())) return true;
    } catch {
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
      if (result.role !== 'confirm') return false;
      started = await this.state.clockIn(undefined, location?.latitude, location?.longitude, location?.accuracyMeters, true);
    }
    if (started) {
      const warning = this.state.syncWarnings()[0];
      if (warning) void this.toast.warning(warning.message);
    }
    if (!started) {
      try {
        if (await firstValueFrom(this.api.getActiveShift())) {
          this.state.syncError.set('');
          return true;
        }
      } catch {
        // Preserve the original clock-in failure below.
      }
      void this.toast.error(this.state.syncError() || 'The shift could not be started.');
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
    let vehicles: DriverVehicle[];
    try {
      vehicles = await firstValueFrom(this.api.getVehicles());
    } catch {
      void this.toast.error('Assigned vehicles could not be loaded.');
      return false;
    }
    if (vehicles.length === 0) {
      void this.toast.error('No active vehicle is assigned to your driver account.');
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
    if (!selected) void this.toast.error(this.state.syncError() || 'The vehicle could not be selected.');
    return selected;
  }

  private vehicleLabel(vehicle: DriverVehicle): string {
    return `${vehicle.unitNumber} · ${[vehicle.name, vehicle.make, vehicle.model].filter(Boolean).join(' · ')}`;
  }
}
