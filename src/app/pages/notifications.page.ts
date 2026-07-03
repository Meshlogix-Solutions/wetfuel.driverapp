import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [RouterLink, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Notifications" subtitle="3 unread" backRoute="/dashboard">
  <main class="screen-body stack">
    <div class="row-between">
      <div class="row wrap"><button class="chip active">All</button><button class="chip">Jobs</button><button class="chip">Safety</button></div>
      <ion-button fill="clear" size="small">Mark all read</ion-button>
    </div>
    <ion-card class="wf-card" routerLink="/job-details"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="water-outline"></ion-icon></div><div class="grow"><strong>New job assignment</strong><p class="caption" style="margin:4px 0 0">WF-2055 · Northline Apartments · Today at 2:00 PM</p><p class="small">12 minutes ago</p></div><span class="status-dot"></span></ion-card-content></ion-card>
    <ion-card class="wf-card" routerLink="/sync"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="cloud-outline"></ion-icon></div><div class="grow"><strong>Delivery queued for sync</strong><p class="caption" style="margin:4px 0 0">WF-2048 was saved safely while the signal was weak.</p><p class="small">18 minutes ago</p></div><span class="status-dot"></span></ion-card-content></ion-card>
    <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="shield-checkmark-outline"></ion-icon></div><div class="grow"><strong>CDL document reminder</strong><p class="caption" style="margin:4px 0 0">Your CDL record expires in 32 days. Contact your manager with the renewed document.</p><p class="small">Yesterday</p></div></ion-card-content></ion-card>
    <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="clipboard-outline"></ion-icon></div><div class="grow"><strong>Route updated</strong><p class="caption" style="margin:4px 0 0">Job WF-2051 has a new site access instruction.</p><p class="small">Yesterday</p></div></ion-card-content></ion-card>
  </main>
</wf-mobile-shell>
  `
})
export class NotificationsPage {

}
