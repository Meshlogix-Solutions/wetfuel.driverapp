import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-meter',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Connect fuel meter" subtitle="Delivery meter" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/equipment'">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card text-center">
      <ion-card-content>
        <div class="icon-tile" style="margin:0 auto 12px;background:rgba(255,255,255,.14);color:#fff"><ion-icon name="bluetooth-outline"></ion-icon></div>
        <span class="pill dark">{{ state.meterConnected() ? 'Ready' : 'Confirmation required' }}</span>
        <h2 style="margin:14px 0 6px">{{ meterName }}</h2>
        <p class="caption" style="margin:0">{{ state.selectedVehicle() }}</p>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <div class="row-between"><span class="caption">Meter status</span><strong>{{ state.meterConnected() ? 'Driver confirmed ready' : 'Confirmation required' }}</strong></div>
        <div class="row-between"><span class="caption">Vehicle</span><strong>{{ state.selectedVehicle() }}</strong></div>
        <div class="row-between"><span class="caption">Capture mode</span><strong>Manual totalizer entry</strong></div>
      </ion-card-content>
    </ion-card>
    <ion-button *ngIf="!state.meterConnected()" class="wf-button" color="tertiary" expand="block" (click)="state.connectMeter()">Confirm meter is ready</ion-button>
    <ion-button *ngIf="state.meterConnected()" class="wf-button" expand="block" [routerLink]="['/jobs',state.selectedJob()?.id,'fueling']">Start fueling setup</ion-button>
    <ion-card class="wf-card warning-card"><ion-card-content><strong>Meter verification</strong><p class="caption" style="margin:6px 0 0">Confirm the physical meter is powered on and record its starting and ending totalizers in delivery proof.</p></ion-card-content></ion-card>
  </main>
</wf-mobile-shell>
  `
})
export class MeterPage {
  constructor(readonly state: DriverStateService) {}
  get meterName(): string {
    const vehicle = this.state.vehicles().find(item => item.id === this.state.selectedVehicleId());
    return vehicle?.meterIdentifier || 'Manual delivery meter';
  }
}
