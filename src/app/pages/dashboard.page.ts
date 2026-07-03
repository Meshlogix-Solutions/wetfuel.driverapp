import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';
import { JOBS } from '../data/mock-data';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Good morning, Dave" subtitle="Friday · July 3" [showNav]="true">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card">
      <ion-card-content>
        <div class="row-between">
          <div>
            <span class="pill dark"><span class="status-dot"></span>&nbsp;{{ state.shiftActive() ? 'Shift active' : 'Ready to start' }}</span>
            <h2 style="margin:16px 0 6px">{{ state.shiftActive() ? '03h 42m on duty' : 'Start your day safely' }}</h2>
            <p class="caption" style="margin:0">{{ state.selectedVehicle() }}</p>
          </div>
          <div class="icon-tile" style="background:rgba(255,255,255,.14);color:#fff"><ion-icon name="truck-outline"></ion-icon></div>
        </div>
        <div style="height:16px"></div>
        <ion-button *ngIf="!state.shiftActive()" class="wf-button" color="tertiary" expand="block" routerLink="/clock-in">Clock in at depot</ion-button>
        <ion-button *ngIf="state.shiftActive()" class="wf-button" color="tertiary" expand="block" routerLink="/active-shift">Open active shift</ion-button>
      </ion-card-content>
    </ion-card>

    <section class="grid-3">
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Today's jobs</span><strong>5</strong><span class="pill success">1 complete</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Planned gallons</span><strong>1,280</strong><span class="caption">gal</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Pending sync</span><strong>{{ state.syncPending() }}</strong><a routerLink="/sync" class="caption">Review</a></ion-card-content></ion-card>
    </section>

    <section>
      <div class="row-between"><h2 class="section-title">Next delivery</h2><a routerLink="/jobs" class="caption">View all</a></div>
      <ion-card class="wf-card">
        <ion-card-content>
          <div class="row-between"><span class="pill warning">Next · 9:15 AM</span><strong>{{ jobs[0].id }}</strong></div>
          <h2 style="margin:15px 0 5px">{{ jobs[0].customer }}</h2>
          <p class="caption">{{ jobs[0].site }}</p>
          <hr class="divider">
          <div class="grid-3">
            <div><span class="caption">Fuel</span><strong style="display:block;margin-top:4px">{{ jobs[0].fuel }}</strong></div>
            <div><span class="caption">Target</span><strong style="display:block;margin-top:4px">{{ jobs[0].gallons }} gal</strong></div>
            <div><span class="caption">Distance</span><strong style="display:block;margin-top:4px">{{ jobs[0].distance }}</strong></div>
          </div>
          <div style="height:14px"></div>
          <ion-button class="wf-button" expand="block" routerLink="/job-details">View job details</ion-button>
        </ion-card-content>
      </ion-card>
    </section>

    <section>
      <h2 class="section-title">Quick actions</h2>
      <div class="grid-2">
        <ion-card class="wf-card compact" routerLink="/incident"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="warning-outline"></ion-icon></div><strong>Report incident</strong></ion-card-content></ion-card>
        <ion-card class="wf-card compact" routerLink="/sync"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="cloud-outline"></ion-icon></div><strong>Sync center</strong></ion-card-content></ion-card>
      </div>
    </section>
  </main>
</wf-mobile-shell>
  `
})
export class DashboardPage {
  readonly state: DriverStateService;
  readonly jobs = JOBS;
  constructor(state: DriverStateService) { this.state = state; }
}
