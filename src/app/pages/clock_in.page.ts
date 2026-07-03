import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonCard, IonCardContent, IonItem, IonInput, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-clock-in',
  standalone: true,
  imports: [MobileShellComponent, IonCard, IonCardContent, IonItem, IonInput, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Clock in" subtitle="Shift setup" backRoute="/dashboard">
  <main class="screen-body stack">
    <section class="map-mock">
      <div class="map-pin" style="left:46%;top:40%"><span>●</span></div><div class="route-line"></div>
      <ion-card class="wf-card compact" style="position:absolute;z-index:3;left:14px;right:14px;bottom:14px;margin:0">
        <ion-card-content>
          <div class="row-between"><div><strong>Dallas North Depot</strong><p class="caption" style="margin:4px 0 0">You are inside the approved clock-in zone.</p></div><span class="pill success">Verified</span></div>
        </ion-card-content>
      </ion-card>
    </section>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <div class="row"><div class="icon-tile"><ion-icon name="location-outline"></ion-icon></div><div><strong>Location verified</strong><p class="caption" style="margin:4px 0 0">Accuracy: 6 meters · Captured 7:28 AM</p></div></div>
        <div class="row"><div class="icon-tile"><ion-icon name="wifi-outline"></ion-icon></div><div><strong>Connection available</strong><p class="caption" style="margin:4px 0 0">Shift start will sync immediately.</p></div></div>
        <ion-item><ion-input label="Optional shift note" labelPlacement="stacked" placeholder="Example: Picking up Truck 14"></ion-input></ion-item>
      </ion-card-content>
    </ion-card>
    <ion-button class="wf-button" color="tertiary" expand="block" (click)="clockIn()">Confirm clock in · 7:28 AM</ion-button>
    <p class="caption text-center">Your GPS location and time will be recorded for compliance.</p>
  </main>
</wf-mobile-shell>
  `
})
export class ClockInPage {
  constructor(private readonly state: DriverStateService, private readonly router: Router) {}
  clockIn(): void { this.state.clockIn(); void this.router.navigateByUrl('/vehicle'); }
}
