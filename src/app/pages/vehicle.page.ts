import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Select vehicle" subtitle="Shift setup" backRoute="/clock-in">
  <main class="screen-body stack">
    <p class="page-lead">Confirm the truck you are operating today. Inventory and meter records will be linked to this unit.</p>
    <ion-card *ngFor="let vehicle of vehicles" class="wf-card selection-card" [class.selected]="selected === vehicle.id" (click)="selected = vehicle.id">
      <ion-card-content class="row">
        <div class="icon-tile"><ion-icon name="truck-outline"></ion-icon></div>
        <div class="grow">
          <h3>{{ state.vehicleDisplay(vehicle) }}</h3>
          <p class="caption">{{ vehicle.unitNumber }} · {{ vehicle.capacityGallons }} gal capacity</p>
          <p class="caption">{{ inventoryPercent(vehicle.inventoryGallons, vehicle.capacityGallons) }}% fuel loaded · Meter {{ vehicle.meterIdentifier ?? 'Manual' }}</p>
        </div>
        <ion-icon [name]="selected === vehicle.id ? 'checkmark-circle-outline' : 'chevron-forward-outline'"></ion-icon>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card warning-card">
      <ion-card-content class="row">
        <div class="icon-tile"><ion-icon name="shield-checkmark-outline"></ion-icon></div>
        <div><strong>Compliance verified</strong><p class="caption" style="margin:4px 0 0">Registration, insurance and inspection are current.</p></div>
      </ion-card-content>
    </ion-card>
    <ion-button class="wf-button" expand="block" (click)="confirm()">Confirm vehicle</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class VehiclePage {
  get vehicles() { return this.state.vehicles(); }
  selected = this.state.selectedVehicleId() ?? this.vehicles[0]?.id ?? '';
  constructor(readonly state: DriverStateService, private readonly router: Router) {}
  async ionViewWillEnter(): Promise<void> {
    try {
      await this.state.refresh();
      if (!this.selected) this.selected = this.vehicles[0]?.id ?? '';
    } catch {
      // Keep cached vehicles available while offline.
    }
  }
  inventoryPercent(inventory: number, capacity: number): number {
    return capacity > 0 ? Math.round((inventory / capacity) * 100) : 0;
  }
  confirm(): void {
    const vehicle = this.vehicles.find(item => item.id === this.selected);
    if (vehicle) this.state.setVehicle(vehicle.name);
    void this.router.navigateByUrl('/pre-trip');
  }
}
