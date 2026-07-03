import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, MobileShellComponent, IonCard, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Driver profile" subtitle="WetFuel Dallas North" [showNav]="true">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card">
      <ion-card-content class="row">
        <div class="avatar" style="width:66px;height:66px;font-size:20px;background:#fff">DM</div>
        <div class="grow">
          <h2 style="margin:0 0 5px">Dave Miller</h2>
          <p class="caption" style="margin:0">Driver ID WF-DAL-1038</p>
          <div style="height:8px"></div>
          <span class="pill dark">Active driver</span>
        </div>
      </ion-card-content>
    </ion-card>

    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <h2 class="section-title">Compliance documents</h2>
        <div class="row"><div class="icon-tile"><ion-icon name="card-outline"></ion-icon></div><div class="grow"><strong>Commercial Driver License</strong><p class="caption" style="margin:4px 0 0">Expires Aug 4, 2026</p></div><span class="pill warning">32 days</span></div>
        <div class="row"><div class="icon-tile"><ion-icon name="medkit-outline"></ion-icon></div><div class="grow"><strong>Medical certificate</strong><p class="caption" style="margin:4px 0 0">Expires Jan 17, 2027</p></div><span class="pill success">Current</span></div>
        <div class="row"><div class="icon-tile"><ion-icon name="shirt-outline"></ion-icon></div><div class="grow"><strong>Hazmat and safety training</strong><p class="caption" style="margin:4px 0 0">Completed Mar 11, 2026</p></div><span class="pill success">Current</span></div>
      </ion-card-content>
    </ion-card>

    <ion-list inset="true">
      <ion-item button routerLink="/vehicle"><ion-icon name="truck-outline" slot="start"></ion-icon><ion-label><h3>Assigned vehicle</h3><p>Truck 14 · Ford F-750</p></ion-label></ion-item>
      <ion-item button routerLink="/sync"><ion-icon name="cloud-outline" slot="start"></ion-icon><ion-label><h3>Offline storage and sync</h3><p>3 records waiting</p></ion-label></ion-item>
      <ion-item button><ion-icon name="notifications-outline" slot="start"></ion-icon><ion-label>Notification preferences</ion-label></ion-item>
      <ion-item button><ion-icon name="help-circle-outline" slot="start"></ion-icon><ion-label>Help and support</ion-label></ion-item>
    </ion-list>

    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/login"><ion-icon slot="start" name="log-out-outline"></ion-icon>Sign out</ion-button>
    <p class="caption text-center">WetFuel Driver v1.0.0 · Tenant WF-001</p>
  </main>
</wf-mobile-shell>
  `
})
export class ProfilePage {

}
