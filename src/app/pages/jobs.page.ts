import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonSegment, IonSegmentButton, IonLabel, IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MobileShellComponent,
    IonSegment, IonSegmentButton, IonLabel, IonCard, IonCardContent, IonButton, IonIcon
  ],
  template: `
<wf-mobile-shell title="Today's jobs" subtitle="5 assigned" [showNav]="true">
  <main class="screen-body stack">
    <ion-segment [(ngModel)]="activeFilter">
      <ion-segment-button *ngFor="let filter of filters" [value]="filter"><ion-label>{{ filter }}</ion-label></ion-segment-button>
    </ion-segment>

    <ion-card class="wf-card hero-card">
      <ion-card-content>
        <div class="row-between">
          <div>
            <span class="pill dark">Route progress</span>
            <h2 style="margin:14px 0 5px">1 of 5 completed</h2>
            <p class="caption" style="margin:0">Next stop is 8.4 miles away.</p>
          </div>
          <strong style="font-size:30px">20%</strong>
        </div>
        <div style="height:14px"></div>
        <div class="progress-track orange"><span style="width:20%"></span></div>
      </ion-card-content>
    </ion-card>

    <ion-card *ngFor="let job of visibleJobs" class="wf-card"
      [routerLink]="job.status === 'completed' ? '/history' : '/job-details'"
      (click)="state.selectJob(job.id)">
      <ion-card-content>
        <div class="row-between">
          <span class="pill" [class.success]="job.status === 'completed'" [class.warning]="job.status === 'next'">{{ statusLabel(job.status) }}</span>
          <strong>{{ job.jobNumber }}</strong>
        </div>
        <h3>{{ job.customerName }}</h3>
        <p class="caption">{{ job.siteAddress }}</p>
        <div class="detail-row"><span>{{ job.scheduledAt | date:'shortTime' }}</span><strong>{{ job.targetGallons }} gal</strong></div>
        <div class="row-between" style="padding-top:10px"><span class="caption">{{ job.fuelType }} · {{ job.distanceMiles ?? '—' }} mi</span><ion-icon name="chevron-forward-outline"></ion-icon></div>
      </ion-card-content>
    </ion-card>

    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/route-map">View full route map</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class JobsPage {
  readonly filters = ['All', 'Assigned', 'Completed'];
  activeFilter = 'All';
  constructor(readonly state: DriverStateService) {}
  ionViewWillEnter(): void {
    void this.state.refresh().catch(() => undefined);
  }
  get visibleJobs() {
    const jobs = this.state.jobs();
    if (this.activeFilter === 'All') return jobs;
    return jobs.filter(job => job.status === this.activeFilter.toLowerCase());
  }
  statusLabel(status: string): string {
    const value = status.replace('_', ' ');
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
