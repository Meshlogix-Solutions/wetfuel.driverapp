import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { firstValueFrom, forkJoin } from 'rxjs';
import { DriverApiService, DriverVehicle } from '../services/driver-api.service';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-vehicle',
  standalone: true,
  imports: [CommonModule, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Confirm vehicle" [subtitle]="'Job ' + (state.selectedJob()?.jobNumber ?? '')" [backRoute]="'/jobs/' + jobId" [showNav]="true">
  <main class="screen-body stack">
    <p class="page-lead">Confirm the vehicle you will use for this job. This confirmation is required for every delivery.</p>
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
    <ion-card *ngIf="!loading() && vehicles().length === 0" class="wf-card warning-card"><ion-card-content><strong>No vehicle assigned</strong><p class="caption" style="margin:4px 0 0">Ask your dispatcher to assign an active vehicle to your driver account.</p></ion-card-content></ion-card>
    <ion-card *ngIf="loadError()" class="wf-card warning-card"><ion-card-content><strong>Vehicles could not be loaded</strong><p class="caption" style="margin:4px 0 0">{{ loadError() }}</p></ion-card-content></ion-card>
    <ion-card *ngIf="vehicles().length > 0" class="wf-card soft-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="shield-checkmark-outline"></ion-icon></div><div><strong>Job-specific confirmation</strong><p class="caption" style="margin:4px 0 0">You will complete the safety checklist for this vehicle next.</p></div></ion-card-content></ion-card>
    <ion-button class="wf-button" expand="block" [disabled]="loading() || state.busy() || !selected" (click)="confirm()">Confirm vehicle for this job</ion-button>
  </main>
</wf-mobile-shell>
  `,
})
export class VehiclePage {
  private readonly api = inject(DriverApiService);
  readonly state = inject(DriverStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly vehicles = signal<DriverVehicle[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');
  readonly jobId = this.route.snapshot.paramMap.get('jobId') ?? '';
  selected = '';

  async ionViewWillEnter(): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const { vehicles, shift } = await firstValueFrom(forkJoin({ vehicles: this.api.getVehicles(), shift: this.api.getActiveShift() }));
      this.vehicles.set(vehicles);
      const currentVehicleId = shift?.vehicleId ?? this.state.selectedVehicleId();
      this.selected = vehicles.some(vehicle => vehicle.id === currentVehicleId) ? currentVehicleId! : vehicles[0]?.id ?? '';
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string }; message?: string };
      this.vehicles.set([]);
      this.selected = '';
      this.loadError.set(failure.error?.message ?? failure.message ?? 'Check your connection and try again.');
    } finally {
      this.loading.set(false);
    }
  }

  inventoryPercent(inventory: number, capacity: number): number { return capacity > 0 ? Math.round((inventory / capacity) * 100) : 0; }

  async confirm(): Promise<void> {
    const vehicle = this.vehicles().find(item => item.id === this.selected);
    if (!vehicle || !this.jobId) return;
    if (!(await this.state.setVehicle(vehicle.id))) return;
    void this.router.navigate(['/jobs', this.jobId, 'pre-job-checklist']);
  }
}
