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
<wf-mobile-shell title="Navigate to site" [subtitle]="'Job ' + (state.selectedJob()?.jobNumber || '')" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '')">
  <main class="screen-body stack">
    <section class="map-mock" style="min-height:410px">
      <div class="map-pin driver-pin" style="left:16%;top:66%"><span>●</span></div>
      <div class="map-pin" style="right:18%;top:24%"><span>●</span></div>
      <div class="route-line" style="width:62%;height:170px;left:24%;top:38%"></div>
      <ion-card class="wf-card compact" style="position:absolute;z-index:3;left:14px;right:14px;bottom:14px;margin:0">
        <ion-card-content>
          <div class="row-between"><div><strong>{{ state.selectedJob()?.distanceMiles ?? '—' }} miles</strong><p class="caption" style="margin:4px 0 0">{{ state.selectedJob()?.siteAddress }}</p></div><span class="pill success">{{ statusLabel }}</span></div>
        </ion-card-content>
      </ion-card>
    </section>
    <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="navigate-outline"></ion-icon></div><div><strong>Navigate with your preferred maps app</strong><p class="caption" style="margin:4px 0 0">{{ state.selectedJob()?.siteAddress }}</p></div></ion-card-content></ion-card>
    <div class="grid-2">
      <ion-button class="wf-button wf-secondary" expand="block" [href]="mapsUrl" target="_blank" rel="noopener">Open Google Maps</ion-button>
      <ion-button class="wf-button" expand="block" [routerLink]="['/jobs', state.selectedJob()?.id, 'arrival']">I've arrived</ion-button>
    </div>
    <ion-button class="wf-button" color="danger" fill="outline" expand="block" routerLink="/incident">Report route or safety issue</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class RouteMapPage {
  constructor(readonly state: DriverStateService) {}
  get statusLabel(): string { const value=this.state.selectedJob()?.status||'assigned';return value.replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase()); }
  get mapsUrl(): string {
    const job = this.state.selectedJob();
    const destination = job?.latitude != null && job?.longitude != null
      ? `${job.latitude},${job.longitude}`
      : job?.siteAddress ?? '';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  }
}
