import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCheckbox, IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-arrival',
  standalone: true,
  imports: [MobileShellComponent, IonCard, IonCardContent, IonIcon, IonItem, IonCheckbox, IonLabel, IonButton],
  template: `
    <wf-mobile-shell title="Site arrival" [subtitle]="state.selectedJob()?.customerName || 'Customer site'" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/route-map'" [showNav]="true">
      <main class="screen-body stack">
        <section class="map-mock">
          <div class="map-pin driver-pin" style="left:48%;top:38%"><span>●</span></div>
          <div style="position:absolute;inset:16%;border:3px dashed var(--wf-primary);border-radius:50%;z-index:1;background:var(--wf-primary-soft)"></div>
        </section>
        <ion-card class="wf-card soft-card"><ion-card-content class="row">
          <div class="icon-tile"><ion-icon name="location-outline"></ion-icon></div>
          <div><strong>Arrival location</strong><p class="caption" style="margin:4px 0 0">{{ locationStatus }}</p></div>
        </ion-card-content></ion-card>
        <ion-card class="wf-card"><ion-card-content>
          <ion-item lines="full" button="true" (click)="positioned=!positioned"><ion-checkbox slot="start" [checked]="positioned" (click)="$event.stopPropagation(); positioned=!positioned"></ion-checkbox><ion-label class="ion-text-wrap"><strong>Vehicle safely positioned</strong><p class="caption">Parking brake set and hazards activated.</p></ion-label></ion-item>
          <ion-item lines="full" button="true" (click)="contactNotified=!contactNotified"><ion-checkbox slot="start" [checked]="contactNotified" (click)="$event.stopPropagation(); contactNotified=!contactNotified"></ion-checkbox><ion-label class="ion-text-wrap"><strong>Site contact notified</strong><p class="caption">Confirm permission to begin delivery.</p></ion-label></ion-item>
          <ion-item lines="none" button="true" (click)="hazardsChecked=!hazardsChecked"><ion-checkbox slot="start" [checked]="hazardsChecked" (click)="$event.stopPropagation(); hazardsChecked=!hazardsChecked"></ion-checkbox><ion-label class="ion-text-wrap"><strong>Area checked for hazards</strong><p class="caption">No ignition sources, spills or obstructions.</p></ion-label></ion-item>
        </ion-card-content></ion-card>
        <ion-button class="wf-button" color="tertiary" expand="block" [disabled]="!canArrive" (click)="arrive()">Check in and scan equipment</ion-button>
      </main>
    </wf-mobile-shell>
  `,
})
export class ArrivalPage {
  positioned = false;
  contactNotified = false;
  hazardsChecked = false;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationStatus = 'Requesting the device location...';
  constructor(readonly state: DriverStateService, private readonly router: Router) {}

  ionViewWillEnter(): void {
    if (!navigator.geolocation) { this.locationStatus = 'Location is unavailable on this device.'; return; }
    navigator.geolocation.getCurrentPosition(
      position => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.accuracy = position.coords.accuracy;
        this.locationStatus = `GPS captured with approximately ${Math.round(position.coords.accuracy)} m accuracy.`;
      },
      () => this.locationStatus = 'Location permission was not granted. Arrival will be recorded without coordinates.',
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }
  get canArrive(): boolean { return this.positioned && this.contactNotified && this.hazardsChecked; }
  async arrive(): Promise<void> {
    const job = this.state.selectedJob();
    if (!job || !this.canArrive) return;
    if (!(await this.state.updateJob(job.id, 'arrived', { latitude:this.latitude, longitude:this.longitude, accuracyMeters:this.accuracy }))) return;
    void this.router.navigate(['/jobs', job.id, 'qr-scanner']);
  }
}
