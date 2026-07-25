import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-delivery-summary',
  standalone: true,
  imports: [MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Complete delivery" subtitle="Review and submit" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/delivery-proof'">
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
    <ion-card class="wf-card warning-card"><ion-card-content><strong>Internet connection required</strong><p class="caption" style="margin:6px 0 0">This delivery is submitted directly to the server — an internet connection is needed to complete it.</p></ion-card-content></ion-card>
    <ion-button class="wf-button" color="tertiary" expand="block" (click)="complete()">Complete job and sync</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class DeliverySummaryPage {
  constructor(
    readonly state: DriverStateService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {}
  async complete(): Promise<void> {
    const job = this.state.selectedJob();
    if (!job) return;
    // The server rejects a delivery.completed event whose gallons don't match the totalizer
    // difference — re-check that here (using the exact value about to be sent, no fallback
    // substitution) instead of trusting a validation that ran on an earlier screen the driver
    // may have skipped past on resume (see job_details.page.ts's proof_submitted shortcut).
    const deliveredGallons = this.state.deliveredGallons();
    if (!deliveredGallons) {
      void this.toast.error('Delivered volume was not captured. Go back to fueling and re-enter it.');
      return;
    }
    const draft = this.state.deliveryDraft();
    if (draft.startingTotalizer != null && draft.endingTotalizer != null) {
      const metered = draft.endingTotalizer - draft.startingTotalizer;
      if (draft.endingTotalizer < draft.startingTotalizer || Math.abs(metered - deliveredGallons) > 0.1) {
        void this.toast.error(`Delivered volume (${deliveredGallons} gal) doesn't match the meter totalizer difference (${metered} gal). Go back and correct the totalizers or delivered volume.`);
        return;
      }
    }
    const ok = await this.state.completeDelivery(job.id, deliveredGallons, {
      startingTotalizer: draft.startingTotalizer,
      endingTotalizer: draft.endingTotalizer,
      notes: draft.notes,
      proof: {
        meterPhotoCaptured: draft.meterPhotoCaptured,
        equipmentPhotoCaptured: draft.equipmentPhotoCaptured,
        meterPhotoUrl: draft.meterPhotoUrl,
        equipmentPhotoUrl: draft.equipmentPhotoUrl,
      },
    });
    if (!ok) {
      void this.toast.error(this.state.syncError() || 'The delivery could not be completed.');
      return;
    }
    void this.router.navigateByUrl('/jobs');
  }
}
