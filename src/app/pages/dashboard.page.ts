import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverApiService, DriverJob, DriverProfile, DriverShift } from '../services/driver-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
<wf-mobile-shell [title]="'Good morning, ' + (profile()?.firstName ?? 'Driver')" subtitle="Today" [showNav]="true">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card">
      <ion-card-content>
        <div class="row-between">
          <div>
            <span class="pill dark"><span class="status-dot"></span>&nbsp;{{ activeShift() ? 'Shift active' : 'Ready to start' }}</span>
            <h2 style="margin:16px 0 6px">{{ activeShift() ? shiftDuration : 'Start your day safely' }}</h2>
            <p class="caption" style="margin:0">{{ vehicleLabel() }}</p>
          </div>
          <div class="icon-tile" style="background:rgba(255,255,255,.14);color:#fff"><ion-icon name="truck-outline"></ion-icon></div>
        </div>
        <div style="height:16px"></div>
        <ion-button *ngIf="!activeShift()" class="wf-button" color="tertiary" expand="block" routerLink="/clock-in">Clock in at depot</ion-button>
        <ion-button *ngIf="activeShift()" class="wf-button" color="tertiary" expand="block" routerLink="/active-shift">Open active shift</ion-button>
      </ion-card-content>
    </ion-card>

    <section class="dashboard-metrics">
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Today's jobs</span><strong>{{ todayJobs().length }}</strong><span class="pill success">{{ completedJobs() }} complete</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Planned gallons</span><strong>{{ plannedGallons() }}</strong><span class="caption">gal</span></ion-card-content></ion-card>
    </section>

    <section>
      <div class="row-between"><h2 class="section-title">Next delivery</h2><a routerLink="/jobs" class="caption">View all</a></div>
      <ion-card class="wf-card">
        <ion-card-content>
          <div class="row-between"><span class="pill warning">Next</span><strong>{{ nextJob()?.jobNumber ?? 'No job' }}</strong></div>
          <h2 style="margin:15px 0 5px">{{ nextJob()?.customerName ?? 'No delivery assigned' }}</h2>
          <p class="caption">{{ nextJob()?.siteAddress ?? 'Check back for assignments.' }}</p>
          <hr class="divider">
          <div class="grid-3">
            <div><span class="caption">Fuel</span><strong style="display:block;margin-top:4px">{{ nextJob()?.fuelType ?? '—' }}</strong></div>
            <div><span class="caption">Target</span><strong style="display:block;margin-top:4px">{{ nextJob()?.targetGallons ?? 0 }} gal</strong></div>
            <div><span class="caption">Distance</span><strong style="display:block;margin-top:4px">{{ nextJob()?.distanceMiles ?? '—' }} mi</strong></div>
          </div>
          <div style="height:14px"></div>
          <ion-button class="wf-button" expand="block" [routerLink]="nextJob() ? ['/jobs', nextJob()!.id] : null" [disabled]="!nextJob()">View job details</ion-button>
        </ion-card-content>
      </ion-card>
    </section>

    <section>
      <h2 class="section-title">Quick actions</h2>
      <div class="grid-2">
        <ion-card class="wf-card compact" routerLink="/incident"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="warning-outline"></ion-icon></div><strong>Report incident</strong></ion-card-content></ion-card>
      </div>
    </section>
  </main>
</wf-mobile-shell>
  `,
  styles: [`
    .dashboard-metrics { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
    .dashboard-metrics .metric { min-width:0; }
  `]
})
export class DashboardPage {
  private readonly api = inject(DriverApiService);

  readonly profile = signal<DriverProfile | null>(null);
  readonly activeShift = signal<DriverShift | null>(null);
  readonly jobs = signal<DriverJob[]>([]);

  readonly todayJobs = computed(() => {
    const today = this.dayKey(new Date());
    return this.jobs().filter(job => job.status !== 'cancelled' && this.dayKey(new Date(job.scheduledAt)) === today);
  });
  readonly completedJobs = computed(() => this.todayJobs().filter(job => job.status === 'completed').length);
  readonly plannedGallons = computed(() => this.todayJobs().reduce((sum, job) => sum + Number(job.targetGallons), 0));
  readonly nextJob = computed(() => this.jobs().find(job => !['completed', 'cancelled'].includes(job.status)) ?? null);
  readonly vehicleLabel = computed(() => {
    const vehicle = this.activeShift()?.vehicle;
    return vehicle ? [vehicle.name, vehicle.make, vehicle.model].filter(Boolean).join(' · ') : 'No vehicle selected';
  });

  ionViewWillEnter(): void {
    this.api.getCurrentDriver().subscribe({ next: p => this.profile.set(p) });
    this.api.getActiveShift().subscribe({ next: s => this.activeShift.set(s) });
    this.api.getJobs().subscribe({ next: j => this.jobs.set(j) });
  }

  get shiftDuration(): string {
    const startedAt = this.activeShift()?.startedAt;
    if (!startedAt) return 'Shift active';
    const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000) - (this.activeShift()?.breakMinutes ?? 0));
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m on duty`;
  }
  private dayKey(value: Date): string { return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`; }
}
