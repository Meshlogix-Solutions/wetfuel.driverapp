import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonIcon, IonLabel, IonSegment, IonSegmentButton } from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

type JobFilter = 'active' | 'upcoming' | 'completed' | 'all';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MobileShellComponent,
    IonSegment, IonSegmentButton, IonLabel, IonCard, IonCardContent, IonButton, IonIcon,
  ],
  template: `
<wf-mobile-shell title="My jobs" [subtitle]="activeCount + ' active'" [showNav]="true">
  <main class="screen-body stack">
    <ion-segment class="jobs-filter" [(ngModel)]="activeFilter" scrollable>
      @for (filter of filters; track filter.key) {
        <ion-segment-button [value]="filter.key"><ion-label>{{ filter.label }}</ion-label></ion-segment-button>
      }
    </ion-segment>

    @if (state.syncError()) {
      <ion-card class="wf-card" style="border:1px solid var(--ion-color-danger)">
        <ion-card-content>
          <strong style="color:var(--ion-color-danger)">Sync issue</strong>
          <p class="caption" style="margin:4px 0 0">{{ state.syncError() }}</p>
        </ion-card-content>
      </ion-card>
    }

    <ion-card class="wf-card hero-card">
      <ion-card-content>
        <div class="row-between">
          <div>
            <span class="pill dark">Today's route</span>
            <h2 style="margin:14px 0 5px">{{ completedTodayCount }} of {{ todayCount }} completed</h2>
            <p class="caption" style="margin:0">{{ routeSummary }}</p>
          </div>
          <strong style="font-size:30px">{{ progressPercent }}%</strong>
        </div>
        <div style="height:14px"></div>
        <div class="progress-track orange"><span [style.width.%]="progressPercent"></span></div>
      </ion-card-content>
    </ion-card>

    @for (job of visibleJobs; track job.id) {
      <ion-card class="wf-card"
        [routerLink]="job.status === 'completed' ? '/history' : ['/jobs', job.id]"
        (click)="state.selectJob(job.id)">
        <ion-card-content>
          <div class="row-between">
            <span class="pill" [ngClass]="statusClass(job.status)">{{ statusLabel(job.status) }}</span>
            <strong>{{ job.jobNumber }}</strong>
          </div>
          <h3>{{ job.customerName }}</h3>
          <p class="caption">{{ job.siteName }}</p>
          <p class="caption">{{ job.siteAddress }}</p>
          <div class="detail-row">
            <span>{{ job.scheduledAt | date:'mediumDate' }} · {{ job.scheduledAt | date:'shortTime' }}</span>
            <strong>{{ job.targetGallons | number:'1.0-0' }} gal</strong>
          </div>
          <div class="row-between" style="padding-top:10px">
            <span class="caption">
              {{ fuelLabel(job.fuelType) }}
              @if (job.distanceMiles != null) { · {{ job.distanceMiles }} mi }
            </span>
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </div>
        </ion-card-content>
      </ion-card>
    } @empty {
      <ion-card class="wf-card">
        <ion-card-content style="text-align:center;padding:2rem 1rem">
          <h3 style="margin-top:0">No {{ activeFilter }} jobs</h3>
          <p class="caption" style="margin-bottom:0">Jobs matching this filter will appear here.</p>
        </ion-card-content>
      </ion-card>
    }

    @if (routeJob) {
      <ion-button class="wf-button wf-secondary" expand="block" [routerLink]="['/jobs', routeJob.id, 'route-map']" (click)="state.selectJob(routeJob.id)">Continue active route</ion-button>
    }
  </main>
</wf-mobile-shell>
  `,
  styles: [`
    .jobs-filter {
      justify-content: flex-start;
      overflow-x: auto;
    }

    .jobs-filter ion-segment-button {
      flex: 1 0 auto;
      min-width: max-content;
      --padding-start: 10px;
      --padding-end: 10px;
    }

    .jobs-filter ion-label {
      overflow: visible;
      text-overflow: clip;
      white-space: nowrap;
    }
  `],
})
export class JobsPage {
  private readonly activeStatuses = new Set([
    'pending', 'assigned', 'started', 'arrived', 'equipment_verified', 'fueling', 'proof_pending',
  ]);
  readonly filters: ReadonlyArray<{ key: JobFilter; label: string }> = [
    { key: 'active', label: 'Active' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'all', label: 'All' },
  ];
  activeFilter: JobFilter = 'active';

  constructor(readonly state: DriverStateService) {}

  ionViewWillEnter(): void {
    void this.state.refresh().catch(() => undefined);
  }

  get visibleJobs() {
    const jobs = this.sortedJobs;
    if (this.activeFilter === 'active') return jobs.filter(job => this.activeStatuses.has(job.status));
    if (this.activeFilter === 'upcoming') {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      return jobs.filter(job => this.activeStatuses.has(job.status) && new Date(job.scheduledAt) > endOfToday);
    }
    if (this.activeFilter === 'completed') return jobs.filter(job => job.status === 'completed');
    return jobs;
  }

  get todayCount(): number { return this.todayJobs.length; }
  get completedTodayCount(): number { return this.todayJobs.filter(job => job.status === 'completed').length; }
  get activeCount(): number { return this.sortedJobs.filter(job => this.activeStatuses.has(job.status)).length; }
  get routeJob() { return this.sortedJobs.find(job => job.status === 'started'); }
  get progressPercent(): number {
    return this.todayCount ? Math.round(this.completedTodayCount / this.todayCount * 100) : 0;
  }
  get routeSummary(): string {
    if (!this.todayCount) return 'No jobs are scheduled for today.';
    const next = this.todayJobs.find(job => this.activeStatuses.has(job.status));
    if (!next) return 'Today\'s route is complete.';
    return next.distanceMiles != null
      ? `Next: ${next.customerName}, ${next.distanceMiles} miles away.`
      : `Next: ${next.customerName} at ${next.siteName}.`;
  }

  statusLabel(status: string): string {
    return status.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  fuelLabel(fuelType: string): string {
    return fuelType.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  statusClass(status: string): string {
    if (status === 'completed') return 'success';
    if (status === 'cancelled') return 'danger';
    if (['pending', 'assigned'].includes(status)) return 'warning';
    return 'info';
  }

  private get sortedJobs() {
    return [...this.state.jobs()].sort(
      (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
    );
  }

  private get todayJobs() {
    const today = this.dayKey(new Date());
    return this.sortedJobs.filter(job => job.status !== 'cancelled' && this.dayKey(new Date(job.scheduledAt)) === today);
  }

  private dayKey(value: Date): string {
    return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
  }
}
