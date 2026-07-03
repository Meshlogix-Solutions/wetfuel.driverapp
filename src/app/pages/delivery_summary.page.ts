import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-delivery-summary',
  standalone: true,
  imports: [MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Complete delivery" subtitle="Review and submit" backRoute="/delivery-proof">
  <main class="screen-body stack">
    <ion-card class="wf-card text-center">
      <ion-card-content>
        <div class="success-orb"><ion-icon name="checkmark-circle-outline"></ion-icon></div>
        <span class="pill success">Ready to complete</span>
        <h2 style="margin:14px 0 5px">Riverside Construction</h2>
        <p class="caption">Generator GEN-04 · Job WF-2048</p>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content>
        <div class="detail-row"><span>Delivered volume</span><strong>186.0 gal</strong></div>
        <div class="detail-row"><span>Fuel price</span><strong>$3.485 / gal</strong></div>
        <div class="detail-row"><span>Fuel subtotal</span><strong>$648.21</strong></div>
        <div class="detail-row"><span>Taxes and fees</span><strong>$72.42</strong></div>
        <hr class="divider">
        <div class="row-between" style="font-size:20px"><strong>Delivery total</strong><strong>$720.63</strong></div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content>
        <div class="timeline">
          <div class="timeline-item"><strong>Arrived at site</strong><p class="caption">9:05 AM · GPS verified</p></div>
          <div class="timeline-item"><strong>Fueling started</strong><p class="caption">9:10 AM · LCR-II connected</p></div>
          <div class="timeline-item"><strong>Fueling completed</strong><p class="caption">9:18 AM · 186.0 gallons</p></div>
          <div class="timeline-item"><strong>Proof collected</strong><p class="caption">2 photos · Driver checklist complete</p></div>
        </div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card warning-card"><ion-card-content><strong>Offline-ready submission</strong><p class="caption" style="margin:6px 0 0">If connectivity is lost, this completed delivery will be securely queued and synced later.</p></ion-card-content></ion-card>
    <ion-button class="wf-button" color="tertiary" expand="block" (click)="complete()">Complete job and sync</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class DeliverySummaryPage {
  constructor(private readonly state: DriverStateService, private readonly router: Router) {}
  complete(): void { this.state.syncPending.update(value => value + 1); void this.router.navigateByUrl('/jobs'); }
}
