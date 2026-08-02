import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonButton, IonCard, IonCardContent, IonCheckbox, IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { ToastService } from '../services/toast.service';
import { ArrivalLocationMapComponent } from '../shared/arrival-location-map.component';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-arrival',
  standalone: true,
  imports: [MobileShellComponent, ArrivalLocationMapComponent, IonCard, IonCardContent, IonIcon, IonItem, IonCheckbox, IonLabel, IonButton],
  template: `
    <wf-mobile-shell title="Site arrival" [subtitle]="state.selectedJob()?.customerName || 'Customer site'" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/route-map'" [showNav]="true">
      <main class="screen-body stack">
        <section class="arrival-map">
          <app-arrival-location-map
            [driverLatitude]="latitude" [driverLongitude]="longitude"
            [siteLatitude]="state.selectedJob()?.latitude" [siteLongitude]="state.selectedJob()?.longitude" />
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
  styles:[`.arrival-map{position:relative;min-height:330px;overflow:hidden;border:1px solid var(--wf-border);border-radius:22px;background:#e6e6e6}`],
})
export class ArrivalPage {
  positioned = false;
  contactNotified = false;
  hazardsChecked = false;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationStatus = 'Requesting the device location...';

  constructor(
    readonly state: DriverStateService,
    private readonly router: Router,
    private readonly toast: ToastService,
    private readonly alerts: AlertController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ionViewWillEnter(): void {
    const jobId = this.state.selectedJob()?.id;
    const captured = this.state.pendingArrivalLocation();
    if (jobId && captured?.jobId === jobId) {
      this.latitude = captured.latitude;
      this.longitude = captured.longitude;
      this.accuracy = captured.accuracyMeters;
      this.locationStatus = `Captured when “I've arrived” was selected, with approximately ${Math.round(captured.accuracyMeters)} m accuracy.`;
      this.cdr.detectChanges();
      return;
    }
    if (!navigator.geolocation) { this.locationStatus = 'Location is unavailable on this device.'; return; }
    navigator.geolocation.getCurrentPosition(
      position => {
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.accuracy = position.coords.accuracy;
        this.locationStatus = `GPS captured with approximately ${Math.round(position.coords.accuracy)} m accuracy.`;
        this.cdr.detectChanges();
      },
      () => { this.locationStatus = 'Location permission is required to confirm arrival.'; this.cdr.detectChanges(); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }

  get canArrive(): boolean { return this.positioned && this.contactNotified && this.hazardsChecked && this.latitude != null && this.longitude != null && !!this.accuracy; }

  async arrive(): Promise<void> {
    const job = this.state.selectedJob();
    if (!job || !this.canArrive) return;
    const location = { latitude:this.latitude, longitude:this.longitude, accuracyMeters:this.accuracy };
    let arrived = await this.state.updateJob(job.id, 'arrived', location);
    if (!arrived && this.state.syncError().includes('not on the customer site yet')) {
      const alert = await this.alerts.create({
        header:'Outside customer site',
        message:'You are not on the customer site yet. Do you still want to mark the job as arrived?',
        buttons:[{ text:'Not yet', role:'cancel' }, { text:'Mark arrived', role:'confirm' }],
      });
      await alert.present();
      const result = await alert.onDidDismiss();
      if (result.role !== 'confirm') return;
      arrived = await this.state.updateJob(job.id, 'arrived', { ...location, confirmOutsideTerritory:true });
    }
    if (!arrived) { void this.toast.error(this.state.syncError() || 'Arrival could not be confirmed.'); return; }
    this.state.clearPendingArrivalLocation(job.id);
    void this.router.navigate(['/jobs', job.id, 'qr-scanner']);
  }
}
