import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonItem, IonInput, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [RouterLink, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonItem, IonInput, IonButton],
  template: `
<wf-mobile-shell title="Delivery history" subtitle="Completed jobs" backRoute="/dashboard">
  <main class="screen-body stack">
    <section class="grid-2">
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">This week</span><strong>18</strong><span class="caption">deliveries</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Delivered</span><strong>4,620</strong><span class="caption">gallons</span></ion-card-content></ion-card>
    </section>
    <ion-item><ion-input label="Search history" labelPlacement="stacked" placeholder="Customer, job ID or equipment"></ion-input></ion-item>
    <section>
      <h2 class="section-title">Today</h2>
      <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="checkmark-circle-outline"></ion-icon></div><div class="grow"><div class="row-between"><h3>Riverside Construction</h3><span class="pill success">Synced</span></div><p class="caption">WF-2048 · Generator GEN-04</p><p><strong>186 gal</strong> · Completed 9:21 AM</p></div></ion-card-content></ion-card>
    </section>
    <section>
      <h2 class="section-title">Yesterday</h2>
      <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="checkmark-circle-outline"></ion-icon></div><div class="grow"><h3>Metro Hospital</h3><p class="caption">WF-2029 · Backup tank B-02</p><p><strong>210 gal</strong> · Completed 3:18 PM</p></div></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="checkmark-circle-outline"></ion-icon></div><div class="grow"><h3>Westbrook Logistics</h3><p class="caption">WF-2024 · Fleet tank FT-11</p><p><strong>405 gal</strong> · Completed 12:04 PM</p></div></ion-card-content></ion-card>
    </section>
    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/jobs">Back to assigned jobs</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class HistoryPage {

}
