import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [RouterLink, MobileShellComponent, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Job WF-2048" subtitle="Next delivery" backRoute="/jobs">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card">
      <ion-card-content>
        <span class="pill dark">Scheduled · 9:15 AM</span>
        <h1 style="margin:16px 0 5px;font-size:28px">Riverside Construction</h1>
        <p class="caption" style="margin:0">4180 Ridgeway Rd, Dallas, TX</p>
      </ion-card-content>
    </ion-card>
    <section class="grid-3">
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Target</span><strong>250</strong><span class="caption">gallons</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Fuel</span><strong style="font-size:18px">Diesel</strong><span class="caption">ULSD</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Equipment</span><strong style="font-size:18px">GEN-04</strong><span class="caption">Generator</span></ion-card-content></ion-card>
    </section>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <h2 class="section-title">Site contact</h2>
        <div class="row"><div class="avatar">JM</div><div class="grow"><strong>Jordan Miles</strong><p class="caption" style="margin:4px 0 0">Site supervisor · (214) 555-0186</p></div><ion-button fill="outline" shape="round"><ion-icon slot="icon-only" name="call-outline"></ion-icon></ion-button></div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <h2 class="section-title">Delivery instructions</h2>
        <div class="row"><div class="icon-tile"><ion-icon name="lock-closed-outline"></ion-icon></div><div><strong>Gate code 4419</strong><p class="caption" style="margin:4px 0 0">Enter through the east service gate.</p></div></div>
        <div class="row"><div class="icon-tile"><ion-icon name="shirt-outline"></ion-icon></div><div><strong>PPE required</strong><p class="caption" style="margin:4px 0 0">High-visibility vest and hard hat.</p></div></div>
        <div class="row"><div class="icon-tile"><ion-icon name="camera-outline"></ion-icon></div><div><strong>Two completion photos</strong><p class="caption" style="margin:4px 0 0">Meter and equipment photos are required.</p></div></div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card warning-card"><ion-card-content><strong>Safety note</strong><p class="caption" style="margin:6px 0 0">Overhead clearance is limited near the generator pad. Approach from the south side.</p></ion-card-content></ion-card>
    <ion-button class="wf-button" color="tertiary" expand="block" routerLink="/route-map">Start job and navigate</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class JobDetailsPage {

}
