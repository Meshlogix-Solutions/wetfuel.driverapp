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
<wf-mobile-shell title="Connect fuel meter" subtitle="LCR device" backRoute="/equipment">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card text-center">
      <ion-card-content>
        <div class="icon-tile" style="margin:0 auto 12px;background:rgba(255,255,255,.14);color:#fff"><ion-icon name="bluetooth-outline"></ion-icon></div>
        <span class="pill dark">{{ state.meterConnected() ? 'Connected' : 'Searching nearby' }}</span>
        <h2 style="margin:14px 0 6px">LCR-II · 7782</h2>
        <p class="caption" style="margin:0">Truck 14 delivery meter</p>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <div class="row-between"><span class="caption">Bluetooth signal</span><strong>Excellent</strong></div>
        <div class="progress-track"><span style="width:92%"></span></div>
        <div class="row-between"><span class="caption">Meter status</span><strong>{{ state.meterConnected() ? 'Ready' : 'Available' }}</strong></div>
        <div class="row-between"><span class="caption">Last calibration</span><strong>May 18, 2026</strong></div>
        <div class="row-between"><span class="caption">Current totalizer</span><strong>58,449.3 gal</strong></div>
      </ion-card-content>
    </ion-card>
    <ion-button *ngIf="!state.meterConnected()" class="wf-button" color="tertiary" expand="block" (click)="state.connectMeter()">Pair with meter</ion-button>
    <ion-button *ngIf="state.meterConnected()" class="wf-button" expand="block" routerLink="/fueling">Start fueling setup</ion-button>
    <ion-button class="wf-button wf-secondary" expand="block">Use manual meter entry</ion-button>
    <ion-card class="wf-card warning-card"><ion-card-content><strong>Connection help</strong><p class="caption" style="margin:6px 0 0">Make sure the LCR device is powered on and Truck 14 is selected for this shift.</p></ion-card-content></ion-card>
  </main>
</wf-mobile-shell>
  `
})
export class MeterPage {
  constructor(readonly state: DriverStateService) {}
}
