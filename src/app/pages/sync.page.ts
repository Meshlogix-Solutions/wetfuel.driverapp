import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [CommonModule, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Sync center" subtitle="Offline data" backRoute="/dashboard">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card">
      <ion-card-content>
        <div class="row-between">
          <div>
            <span class="pill dark">Cloud connection available</span>
            <h2 style="margin:14px 0 5px">{{ state.syncPending() }} records waiting</h2>
            <p class="caption" style="margin:0">{{ state.lastSyncAt() ? ('Last successful sync ' + (state.lastSyncAt() | date:'short')) : 'No successful sync recorded in this session.' }}</p>
          </div>
          <div class="icon-tile" style="background:rgba(255,255,255,.14);color:#fff"><ion-icon name="cloud-outline"></ion-icon></div>
        </div>
        <div style="height:14px"></div>
        <div class="progress-track orange"><span [style.width.%]="state.syncPending() ? 66 : 100"></span></div>
      </ion-card-content>
    </ion-card>

    <ion-card *ngIf="state.syncPending() > 0" class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="water-outline"></ion-icon></div><div class="grow"><strong>Driver activity · {{ state.selectedJob()?.jobNumber || 'shift' }}</strong><p class="caption" style="margin:4px 0 0">{{ state.syncPending() }} encrypted event(s) waiting for the server</p></div><span class="pill warning">Queued</span></ion-card-content></ion-card>
    <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="time-outline"></ion-icon></div><div class="grow"><strong>Shift activity</strong><p class="caption" style="margin:4px 0 0">Clock-in and job timestamps</p></div><span class="pill success">Synced</span></ion-card-content></ion-card>

    @if (state.syncError()) {
      <ion-card class="wf-card danger-card"><ion-card-content><strong>Synchronization needs attention</strong><p class="caption" style="margin:6px 0 0">{{ state.syncError() }}</p></ion-card-content></ion-card>
    }
    <ion-button class="wf-button" expand="block" [disabled]="state.syncInProgress()" (click)="state.clearSync()">{{ state.syncInProgress() ? 'Syncing...' : 'Sync all now' }}</ion-button>
    <ion-card *ngIf="state.syncPending() === 0" class="wf-card soft-card text-center"><ion-card-content><strong>Everything is up to date</strong><p class="caption">No offline records are waiting to sync.</p></ion-card-content></ion-card>
    <ion-card class="wf-card warning-card"><ion-card-content><strong>Conflict handling</strong><p class="caption" style="margin:6px 0 0">Failed records remain on this device. The server message above identifies what must be corrected before retrying.</p></ion-card-content></ion-card>
  </main>
</wf-mobile-shell>
  `
})
export class SyncPage {
  constructor(readonly state: DriverStateService) {}
}
