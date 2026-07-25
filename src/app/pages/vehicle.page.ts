import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverApiService, DriverVehicle } from '../services/driver-api.service';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Select vehicle" subtitle="Shift setup" backRoute="/clock-in">
  <main class="screen-body stack">
    <p class="page-lead">Confirm the truck you are operating today. Inventory and meter records will be linked to this unit.</p>
    <ion-card *ngFor="let vehicle of vehicles()" class="wf-card selection-card" [class.selected]="selected === vehicle.id" (click)="selected = vehicle.id">
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
    <ion-card *ngIf="!loading() && vehicles().length === 0" class="wf-card warning-card">
      <ion-card-content>
        <strong>No vehicle assigned</strong>
        <p class="caption" style="margin:4px 0 0">Ask your dispatcher to assign an active vehicle to your driver account.</p>
      </ion-card-content>
    </ion-card>
    <ion-card *ngIf="loadError()" class="wf-card warning-card">
      <ion-card-content>
        <strong>Vehicles could not be loaded</strong>
        <p class="caption" style="margin:4px 0 0">{{ loadError() }}</p>
      </ion-card-content>
    </ion-card>
    <ion-card *ngIf="vehicles().length > 0" class="wf-card warning-card">
      <ion-card-content class="row">
        <div class="icon-tile"><ion-icon name="shield-checkmark-outline"></ion-icon></div>
        <div><strong>Compliance verified</strong><p class="caption" style="margin:4px 0 0">Registration, insurance and inspection are current.</p></div>
      </ion-card-content>
    </ion-card>
    <ion-button class="wf-button" expand="block" [disabled]="loading() || !selected" (click)="confirm()">Confirm vehicle</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class VehiclePage {
  private readonly api = inject(DriverApiService);
  readonly state = inject(DriverStateService);
  private readonly router = inject(Router);

  readonly vehicles = signal<DriverVehicle[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  selected = this.state.selectedVehicleId() ?? '';

  ionViewWillEnter(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.api.getVehicles().subscribe({
      next: vehicles => {
        this.vehicles.set(vehicles);
        if (!vehicles.some(vehicle => vehicle.id === this.selected)) {
          this.selected = vehicles[0]?.id ?? '';
        }
        this.loading.set(false);
      },
      error: error => {
        this.vehicles.set([]);
        this.selected = '';
        this.loadError.set(error?.error?.message ?? 'Check your connection and try again.');
        this.loading.set(false);
      },
    });
  }
  inventoryPercent(inventory: number, capacity: number): number {
    return capacity > 0 ? Math.round((inventory / capacity) * 100) : 0;
  }
  async confirm(): Promise<void> {
    const vehicle = this.vehicles().find(item => item.id === this.selected);
    if (!vehicle) return;
    if (!(await this.state.setVehicle(vehicle.id))) return;
    void this.router.navigateByUrl('/pre-trip');
  }
}
