import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonItem, IonCheckbox, IonLabel, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-arrival',
  standalone: true,
  imports: [RouterLink, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonItem, IonCheckbox, IonLabel, IonButton],
  template: `
<wf-mobile-shell title="Site arrival" [subtitle]="state.selectedJob()?.customerName || 'Customer site'" backRoute="/route-map">
  <main class="screen-body stack">
    <section class="map-mock">
      <div class="map-pin driver-pin" style="left:48%;top:38%"><span>●</span></div>
      <div style="position:absolute;inset:16%;border:3px dashed var(--wf-teal);border-radius:50%;z-index:1;background:rgba(10,155,142,.08)"></div>
    </section>
    <ion-card class="wf-card soft-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="checkmark-circle-outline"></ion-icon></div><div><strong>Inside customer geofence</strong><p class="caption" style="margin:4px 0 0">GPS accuracy 5 m · Arrival recorded 9:05 AM</p></div></ion-card-content></ion-card>
    <ion-card class="wf-card">
      <ion-card-content>
        <ion-item lines="full">
          <ion-checkbox slot="start" [checked]="true"></ion-checkbox>
          <ion-label class="ion-text-wrap"><strong>Vehicle safely positioned</strong><p class="caption">Parking brake set and hazards activated.</p></ion-label>
        </ion-item>
        <ion-item lines="full">
          <ion-checkbox slot="start"></ion-checkbox>
          <ion-label class="ion-text-wrap"><strong>Site contact notified</strong><p class="caption">Confirm permission to begin delivery.</p></ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"></ion-checkbox>
          <ion-label class="ion-text-wrap"><strong>Area checked for hazards</strong><p class="caption">No ignition sources, spills or obstructions.</p></ion-label>
        </ion-item>
      </ion-card-content>
    </ion-card>
    <ion-button class="wf-button" color="tertiary" expand="block" (click)="arrive()">Check in and scan equipment</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class ArrivalPage {
  constructor(readonly state: DriverStateService, private readonly router: Router) {}
  arrive(): void {
    const job = this.state.selectedJob();
    if (job) this.state.updateJob(job.id, 'arrived');
    void this.router.navigateByUrl('/qr-scanner');
  }
}
