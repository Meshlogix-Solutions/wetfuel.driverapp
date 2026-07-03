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
    <ion-card *ngFor="let vehicle of vehicles" class="wf-card selection-card" [class.selected]="selected === vehicle.name" (click)="selected = vehicle.name">
      <ion-card-content class="row">
        <div class="icon-tile"><ion-icon name="truck-outline"></ion-icon></div>
        <div class="grow">
          <h3>{{ vehicle.name }}</h3>
          <p class="caption">{{ vehicle.unit }} · {{ vehicle.capacity }} gal capacity</p>
          <p class="caption">{{ vehicle.inventory }}% fuel loaded · Meter {{ vehicle.meter }}</p>
        </div>
        <ion-icon [name]="selected === vehicle.name ? 'checkmark-circle-outline' : 'chevron-forward-outline'"></ion-icon>
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
  readonly vehicles = [
    { name: 'Truck 14 · Ford F-750', unit: 'WF-DAL-014', capacity: '2,000', inventory: 64, meter: 'LCR-II 7782' },
    { name: 'Truck 08 · Peterbilt 337', unit: 'WF-DAL-008', capacity: '2,500', inventory: 82, meter: 'LCR-IQ 5510' }
  ];
  selected = this.vehicles[0].name;
  constructor(private readonly state: DriverStateService, private readonly router: Router) {}
  confirm(): void { this.state.setVehicle(this.selected); void this.router.navigateByUrl('/pre-trip'); }
}
