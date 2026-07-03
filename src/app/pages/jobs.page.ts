import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonSegment, IonSegmentButton, IonLabel, IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { JOBS } from '../data/mock-data';

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

    <ion-card *ngFor="let job of visibleJobs" class="wf-card" [routerLink]="job.status === 'Completed' ? '/history' : '/job-details'">
      <ion-card-content>
        <div class="row-between">
          <span class="pill" [class.success]="job.status === 'Completed'" [class.warning]="job.status === 'Next'">{{ job.status }}</span>
          <strong>{{ job.id }}</strong>
        </div>
        <h3>{{ job.customer }}</h3>
        <p class="caption">{{ job.site }}</p>
        <div class="detail-row"><span>{{ job.time }}</span><strong>{{ job.gallons }} gal</strong></div>
        <div class="row-between" style="padding-top:10px"><span class="caption">{{ job.fuel }} · {{ job.distance }}</span><ion-icon name="chevron-forward-outline"></ion-icon></div>
      </ion-card-content>
    </ion-card>

    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/route-map">View full route map</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class JobsPage {
  readonly jobs = JOBS;
  readonly filters = ['All', 'Assigned', 'Completed'];
  activeFilter = 'All';
  get visibleJobs() { return this.activeFilter === 'All' ? this.jobs : this.jobs.filter(job => job.status === this.activeFilter); }
}
