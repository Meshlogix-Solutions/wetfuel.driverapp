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
        <h2 style="margin:14px 0 5px">{{ state.selectedJob()?.customerName || 'Delivery' }}</h2>
        <p class="caption">{{ state.selectedJob()?.equipmentName || 'Equipment' }} · Job {{ state.selectedJob()?.jobNumber }}</p>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content>
        <div class="detail-row"><span>Delivered volume</span><strong>{{ state.deliveredGallons() || state.selectedJob()?.targetGallons || 0 }} gal</strong></div>
        <div class="detail-row"><span>Fuel type</span><strong>{{ state.selectedJob()?.fuelType || '—' }}</strong></div>
        <div class="detail-row"><span>Site</span><strong>{{ state.selectedJob()?.siteName || '—' }}</strong></div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content>
        <div class="timeline">
          <div class="timeline-item"><strong>Arrived at site</strong><p class="caption">GPS arrival recorded</p></div>
          <div class="timeline-item"><strong>Fueling completed</strong><p class="caption">{{ state.deliveredGallons() || state.selectedJob()?.targetGallons || 0 }} gallons</p></div>
          <div class="timeline-item"><strong>Proof collected</strong><p class="caption">Delivery proof ready for sync</p></div>
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
  constructor(readonly state: DriverStateService, private readonly router: Router) {}
  complete(): void {
    const job = this.state.selectedJob();
    if (job) {
      this.state.completeDelivery(job.id, this.state.deliveredGallons() || job.targetGallons, {
        notes: 'Delivery completed safely.',
        proof: { meterPhotoCaptured: true, equipmentPhotoCaptured: true },
      });
    }
    void this.router.navigateByUrl('/jobs');
  }
}
