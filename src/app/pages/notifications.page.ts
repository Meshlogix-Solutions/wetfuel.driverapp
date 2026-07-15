import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Notifications" [subtitle]="unreadCount() + ' active'" backRoute="/dashboard">
  <main class="screen-body stack">
    <div class="row-between">
      <div class="row wrap"><button class="chip active">All</button><button class="chip">Jobs</button><button class="chip">Safety</button></div>
      <ion-button fill="clear" size="small">Mark all read</ion-button>
    </div>
    <ion-card *ngFor="let job of assignedJobs()" class="wf-card" routerLink="/jobs"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="water-outline"></ion-icon></div><div class="grow"><strong>Job assignment</strong><p class="caption" style="margin:4px 0 0">{{ job.jobNumber }} · {{ job.customerName }} · {{ job.scheduledAt | date:'short' }}</p></div><span class="status-dot"></span></ion-card-content></ion-card>
    <ion-card *ngIf="state.syncPending() > 0" class="wf-card" routerLink="/sync"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="cloud-outline"></ion-icon></div><div class="grow"><strong>Driver activity queued for sync</strong><p class="caption" style="margin:4px 0 0">{{ state.syncPending() }} record(s) are saved safely on this device.</p></div><span class="status-dot"></span></ion-card-content></ion-card>
    <ion-card *ngFor="let certification of expiringCertifications()" class="wf-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="shield-checkmark-outline"></ion-icon></div><div class="grow"><strong>{{ certification.name }} reminder</strong><p class="caption" style="margin:4px 0 0">Expires {{ certification.expiryDate | date:'mediumDate' }}. Contact your manager with the renewed document.</p></div></ion-card-content></ion-card>
    <ion-card *ngIf="unreadCount() === 0" class="wf-card soft-card text-center"><ion-card-content><strong>Nothing needs attention</strong><p class="caption">Assignments, sync status and certification reminders will appear here.</p></ion-card-content></ion-card>
  </main>
</wf-mobile-shell>
  `
})
export class NotificationsPage {
  constructor(readonly state: DriverStateService) {}
  assignedJobs = () => this.state.jobs().filter(job => job.status === 'assigned').slice(0, 5);
  expiringCertifications = () => this.state.profile()?.certifications
    .filter(item => item.status !== 'current').slice(0, 5) ?? [];
  unreadCount = () => this.assignedJobs().length
    + this.expiringCertifications().length
    + (this.state.syncPending() > 0 ? 1 : 0);
}
