import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-route-map',
  standalone: true,
  imports: [RouterLink, MobileShellComponent, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Navigate to site" [subtitle]="'Job ' + (state.selectedJob()?.jobNumber || '')" backRoute="/job-details">
  <main class="screen-body stack">
    <section class="map-mock" style="min-height:410px">
      <div class="map-pin driver-pin" style="left:16%;top:66%"><span>●</span></div>
      <div class="map-pin" style="right:18%;top:24%"><span>●</span></div>
      <div class="route-line" style="width:62%;height:170px;left:24%;top:38%"></div>
      <ion-card class="wf-card compact" style="position:absolute;z-index:3;left:14px;right:14px;bottom:14px;margin:0">
        <ion-card-content>
          <div class="row-between"><div><strong>{{ state.selectedJob()?.distanceMiles || 0 }} miles</strong><p class="caption" style="margin:4px 0 0">{{ state.selectedJob()?.siteAddress }}</p></div><span class="pill success">Assigned</span></div>
        </ion-card-content>
      </ion-card>
    </section>
    <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="navigate-outline"></ion-icon></div><div><strong>Head northeast on Depot Way</strong><p class="caption" style="margin:4px 0 0">Continue for 1.8 miles, then turn right.</p></div></ion-card-content></ion-card>
    <div class="grid-2">
      <ion-button class="wf-button wf-secondary" expand="block">Open Google Maps</ion-button>
      <ion-button class="wf-button" expand="block" routerLink="/arrival">I've arrived</ion-button>
    </div>
    <ion-button class="wf-button" color="danger" fill="outline" expand="block" routerLink="/incident">Report route or safety issue</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class RouteMapPage {
  constructor(readonly state: DriverStateService) {}
}
