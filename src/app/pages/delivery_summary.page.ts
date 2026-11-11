import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { LoaderComponent } from '../shared/loader.component';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';
import { ConnectivityService } from '../services/connectivity.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-delivery-summary',
  standalone: true,
  imports: [MobileShellComponent, LoaderComponent, IonCard, IonCardContent, IonIcon, IonButton],
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
        <div class="detail-row"><span>Delivered volume</span><strong>{{ deliveredGallons }} gal</strong></div>
        <div class="detail-row"><span>Fuel type</span><strong>{{ state.selectedJob()?.fuelType || '—' }}</strong></div>
        <div class="detail-row"><span>Site</span><strong>{{ state.selectedJob()?.siteName || '—' }}</strong></div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content>
        <div class="timeline">
          <div class="timeline-item"><strong>Arrived at site</strong><p class="caption">GPS arrival recorded</p></div>
          <div class="timeline-item"><strong>Fueling completed</strong><p class="caption">{{ deliveredGallons }} gallons</p></div>
          <div class="timeline-item"><strong>Proof collected</strong><p class="caption">Delivery proof ready for sync</p></div>
        </div>
      </ion-card-content>
    </ion-card>
    @if (connectivity.online()) {
      <ion-card class="wf-card soft-card"><ion-card-content><strong>Complete and sync</strong><p class="caption" style="margin:6px 0 0">Your delivery will be submitted to the server now.</p></ion-card-content></ion-card>
    } @else {
      <ion-card class="wf-card warning-card"><ion-card-content><strong>Offline — saved on device</strong><p class="caption" style="margin:6px 0 0">Complete this job locally. Everything will sync automatically when you reconnect.</p></ion-card-content></ion-card>
    }
    <ion-button class="wf-button" color="tertiary" expand="block" [disabled]="state.busy()" (click)="complete()">
      @if (state.busy()) { <wf-loader mode="button" /> }
      {{ connectivity.online() ? 'Complete job and sync' : 'Complete job offline' }}
    </ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class DeliverySummaryPage {
  readonly state = inject(DriverStateService);
  readonly connectivity = inject(ConnectivityService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  get deliveredGallons(): number {
    return Number(this.state.selectedJob()?.fueledGallons ?? 0);
  }

  async complete(): Promise<void> {
    const job = this.state.selectedJob();
    if (!job) return;
    const deliveredGallons = this.deliveredGallons;
    const proof = job.proof;
    if (!deliveredGallons) {
      void this.toast.error('Delivered volume was not captured. Go back to fueling and re-enter it.');
      return;
    }
    if (!proof?.meterPhotoUrl || !proof?.equipmentPhotoUrl) {
      void this.toast.error('Take the meter photo and the equipment photo before completing this delivery.');
      return;
    }
    if (proof.startingTotalizer != null && proof.endingTotalizer != null) {
      const metered = proof.endingTotalizer - proof.startingTotalizer;
      if (proof.endingTotalizer < proof.startingTotalizer || Math.abs(metered - deliveredGallons) > 0.1) {
        void this.toast.error(`Delivered volume (${deliveredGallons} gal) doesn't match the meter totalizer difference (${metered} gal). Go back and correct the totalizers or delivered volume.`);
        return;
      }
    }
    const ok = await this.state.completeDelivery(job.id, deliveredGallons, {
      startingTotalizer: proof.startingTotalizer,
      endingTotalizer: proof.endingTotalizer,
      notes: proof.notes,
      proof: {
        meterPhotoCaptured: true,
        equipmentPhotoCaptured: true,
        meterPhotoUrl: proof.meterPhotoUrl,
        equipmentPhotoUrl: proof.equipmentPhotoUrl,
      },
    });
    if (!ok) {
      void this.toast.error(this.state.consumeSyncError('The delivery could not be completed.'));
      return;
    }
    if (this.state.pendingSync()) {
      void this.toast.success('Delivery saved on device. It will sync when you are back online.');
    } else {
      void this.toast.success('Delivery completed and synced.');
    }
    void this.router.navigateByUrl('/jobs');
  }
}
