import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import {
  DriverApiService,
  DriverDashboardJobs,
  DriverDashboardSummary,
  DriverJob,
  DriverProfile,
  DriverShift,
} from '../services/driver-api.service';
import { firstValueFrom } from 'rxjs';
import { DriverNotificationService } from '../services/driver-notification.service';
import { DriverStateService } from '../services/driver-state.service';
import { DriverWorkflowService } from '../services/driver-workflow.service';
import { MobileShellComponent, RefreshRequest } from '../shared/mobile-shell.component';
import { LoaderComponent } from '../shared/loader.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileShellComponent, LoaderComponent, IonIcon],
  template: `
<wf-mobile-shell
  [title]="greeting + ', ' + (profile()?.firstName || 'Driver')"
  subtitle="Driver dashboard"
  [showNav]="true"
  [refreshable]="true"
  (refreshRequested)="refreshDashboard($event)"
  [networkIconOnly]="true">
  <main class="driver-dashboard">
    <header class="dashboard-header" hidden>
      <h1>{{ greeting }},<br><span>{{ profile()?.firstName || 'Driver' }}</span> <em>👋</em></h1>
      <div class="header-actions">
        <div class="round-action" aria-label="Connection available"><ion-icon name="wifi-outline"></ion-icon></div>
        <a class="round-action" routerLink="/notifications" aria-label="Notifications">
          <ion-icon name="notifications-outline"></ion-icon>
          @if (notifications.unreadCount()) {
            <span class="notification-count">{{ badgeLabel }}</span>
          }
        </a>
      </div>
    </header>

    @if (dashboardLoading() && !hasLoaded()) {
      <section class="panel dashboard-loading"><wf-loader mode="section" message="Loading your dashboard..." /></section>
    } @else {
      @if (dashboardError()) {
        <section class="dashboard-error"><span>{{ dashboardError() }}</span><button type="button" (click)="loadDashboard()">Retry</button></section>
      }

    <section class="status-strip duo" aria-label="Job and shift status">
      <div class="status-segment" [class.active]="!!activeJob()">
        <ion-icon name="briefcase-outline"></ion-icon>
        <span class="live-dot"></span>
        <span>{{ jobStatusLabel }}</span>
      </div>
      <div class="status-segment" [class.active]="isShiftActive" [class.break]="isShiftPaused">
        <ion-icon name="time-outline"></ion-icon>
        <span class="live-dot"></span>
        <span>{{ shiftStatusLabel }}</span>
      </div>
    </section>

    <section class="panel active-shift-panel" [class.inactive]="!activeShift()">
      <div
        class="shift-details"
        [class.interactive]="!!activeShift()"
        [attr.role]="activeShift() ? 'button' : null"
        [attr.tabindex]="activeShift() ? 0 : null"
        (click)="activeShift() && handleShiftAction()"
        (keydown.enter)="activeShift() && handleShiftAction()"
        (keydown.space)="$event.preventDefault(); activeShift() && handleShiftAction()">
        <div class="shift-orb"><ion-icon name="truck-outline"></ion-icon></div>
        <div class="shift-detail">
          <span>{{ activeShift() ? 'On duty since' : 'Current status' }}</span>
          <strong>{{ activeShift() ? (activeShift()!.startedAt | date:'shortTime') : 'Off duty' }}</strong>
          @if (!activeShift()) { <small>Start your shift to select a vehicle and begin deliveries.</small> }
        </div>
        <div class="shift-detail vehicle-detail">
          <span>Current vehicle</span>
          <strong>{{ activeShift()?.vehicleId ? currentVehiclePlate : 'Not selected' }}</strong>
        </div>
        <ion-icon class="panel-chevron" name="chevron-forward-outline"></ion-icon>
      </div>
      @if (activeShift()?.vehicle; as vehicle) {
        <div class="vehicle-inventory" aria-label="Fuel remaining in selected vehicle">
          <div class="vehicle-inventory-heading">
            <span><ion-icon name="water-outline"></ion-icon> Fuel remaining in truck</span>
            <strong>{{ vehicle.inventoryGallons | number:'1.0-0' }} / {{ vehicle.capacityGallons | number:'1.0-0' }} gal</strong>
          </div>
          <div class="vehicle-inventory-track" role="progressbar" aria-label="Truck fuel remaining"
            aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="vehicleInventoryPercent">
            <span [style.width.%]="vehicleInventoryPercent"></span>
          </div>
          <small>{{ vehicleInventoryPercent }}% onboard</small>
        </div>
      }
      <button class="primary-dashboard-button" type="button" [disabled]="dashboardLoading() || state.busy()" (click)="handleShiftAction()">
        {{ shiftActionLabel }}
      </button>
    </section>

    <section class="metric-grid">
      <article class="metric-panel">
        <div class="metric-icon"><ion-icon name="water-outline"></ion-icon></div>
        <span>Delivered / Planned</span>
        <strong>{{ summary().deliveredGallons | number:'1.0-0' }} <small>/ {{ summary().plannedGallons | number:'1.0-0' }} gal</small></strong>
        <div class="progress-track"><span [style.width.%]="deliveryProgress"></span></div>
        <p><b>{{ remainingGallons | number:'1.0-0' }} gal</b> remaining</p>
      </article>
      <article class="metric-panel" [class.shortfall]="fuelShortfall > 0">
        <div class="metric-icon"><ion-icon name="flame-outline"></ion-icon></div>
        <span>Required fuel</span>
        <strong>{{ remainingGallons | number:'1.0-0' }} <small>gal</small></strong>
        @if (activeShift()?.vehicle; as vehicle) {
          <p><b>{{ vehicle.inventoryGallons | number:'1.0-0' }} gal</b> in truck
            @if (fuelShortfall > 0) { &middot; short {{ fuelShortfall | number:'1.0-0' }} gal }
          </p>
        } @else {
          <p>Select a vehicle to compare truck inventory</p>
        }
      </article>
      <article class="metric-panel">
        <div class="metric-icon"><ion-icon name="briefcase-outline"></ion-icon></div>
        <span>Today's jobs</span>
        <strong>{{ summary().plannedJobs }}</strong>
        <p class="complete-pill">{{ summary().completedJobs }} complete</p>
      </article>
      <article class="metric-panel">
        <div class="metric-icon"><ion-icon name="time-outline"></ion-icon></div>
        <span>Hours on duty</span>
        <strong>{{ activeShift() ? shiftDuration : '0h 00m' }}</strong>
        <p>{{ activeShift() ? 'Since ' + (activeShift()!.startedAt | date:'shortTime') : 'Shift not started' }}</p>
      </article>
    </section>

    <section class="panel delivery-panel" [class.clickable]="!!displayedJob()" [routerLink]="displayedJob() ? ['/jobs', displayedJob()!.id] : null">
      <div class="section-heading">
        <h2>{{ activeJob() ? 'Active job' : 'Next delivery' }}</h2>
        <a routerLink="/jobs" (click)="$event.stopPropagation()">View all</a>
      </div>
      @if (displayedJob(); as job) {
        <div class="job-identity">
          <div class="job-sequence">{{ displayedJobSequence }}</div>
          <div>
            <strong>{{ job.customerName }}</strong>
            <p>{{ job.siteAddress || job.siteName }}</p>
          </div>
          <ion-icon name="chevron-forward-outline"></ion-icon>
        </div>
        <div class="delivery-facts">
          <div><ion-icon name="time-outline"></ion-icon><strong>{{ job.scheduledAt | date:'shortTime' }}</strong><span>ETA</span></div>
          <div><ion-icon name="water-outline"></ion-icon><strong>{{ job.targetGallons | number:'1.0-0' }} gal</strong><span>To deliver</span></div>
          <div><ion-icon name="location-outline"></ion-icon><strong>{{ job.distanceMiles != null ? (job.distanceMiles | number:'1.0-1') + ' mi' : '—' }}</strong><span>Distance</span></div>
        </div>
        <button class="outline-dashboard-button" type="button" (click)="advanceDisplayedJob($event)">
          {{ activeJob() ? 'Continue active job' : 'View job details' }}
        </button>
      } @else {
        <div class="empty-delivery">
          <div class="empty-icon"><ion-icon name="clipboard-outline"></ion-icon></div>
          <strong>No delivery assigned</strong>
          <p>You're all set. We'll notify you when a new delivery is assigned.</p>
        </div>
      }
    </section>
    }
  </main>
</wf-mobile-shell>
  `,
  styles: [`
    :host { display: block; min-height: 100%; background: #090a0e; color: #f7f7f8; }
    .driver-dashboard { width: min(100%, 720px); min-height: 100%; margin: 0 auto; padding: max(28px, env(safe-area-inset-top)) 18px 112px; display: grid; gap: 16px; background: radial-gradient(circle at 50% -20%, #181a21 0, #090a0e 38%); color: #f7f7f8; }
    .dashboard-header[hidden] { display: none !important; }
    .dashboard-header { justify-content: space-between; align-items: center; gap: 14px; padding: 4px 2px 2px; }
    .dashboard-header h1 { margin: 0; font-size: clamp(29px, 8vw, 38px); line-height: 1.12; letter-spacing: -.045em; font-weight: 780; }
    .dashboard-header h1 span { color: #f21d2f; }
    .dashboard-header h1 em { font-style: normal; font-size: .72em; }
    .dashboard-loading { min-height: 180px; display: flex; align-items: center; justify-content: center; gap: 12px; color: #d8d8dc; }
    .dashboard-error { padding: 11px 13px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid #74333b; border-radius: 13px; background: #251317; color: #ffc4ca; font-size: 12px; }
    .dashboard-error button { border: 0; background: transparent; color: #ff5362; font: inherit; font-weight: 800; }
    .header-actions { display: flex; gap: 10px; }
    .round-action { position: relative; width: 48px; height: 48px; display: grid; place-items: center; border: 1px solid #24262d; border-radius: 50%; background: #17181e; color: #f5f5f7; text-decoration: none; }
    .round-action ion-icon { font-size: 23px; }
    .notification-count { position: absolute; top: -4px; right: -2px; min-width: 20px; height: 20px; padding: 0 5px; display: grid; place-items: center; border: 2px solid #090a0e; border-radius: 999px; background: #f21d2f; color: #fff; font-size: 10px; font-weight: 850; }
    .status-strip { min-height: 58px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: center; overflow: hidden; border: 1px solid #30323a; border-radius: 16px; background: linear-gradient(180deg,#17181e,#111217); box-shadow: inset 0 1px rgba(255,255,255,.025); }
    .status-strip.duo { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .status-segment { min-width: 0; min-height: 30px; padding: 0 13px; display: flex; align-items: center; justify-content: center; gap: 8px; color: #d7d7db; font-size: 12px; border-right: 1px solid #30323a; }
    .status-segment:last-child { border-right: 0; }
    .status-segment strong { color: #a6a7ad; white-space: nowrap; }
    .status-segment.active strong { color: #43dd67; }
    .status-segment.break strong { color: #ffb347; }
    .status-segment ion-icon { flex: 0 0 auto; color: var(--wf-primary); font-size: 18px; }
    .status-segment > span:not(.live-dot) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .live-dot { width: 9px; height: 9px; flex: 0 0 auto; border-radius: 50%; background: #71737b; box-shadow: 0 0 0 3px rgba(113,115,123,.09); }
    .status-segment.active .live-dot { background: #39e35d; box-shadow: 0 0 0 3px rgba(57,227,93,.09); }
    .status-segment.break .live-dot { background: #ffad3d; box-shadow: 0 0 0 3px rgba(255,173,61,.09); }
    button.status-segment { border-top: 0; border-bottom: 0; border-left: 0; background: transparent; font: inherit; cursor: pointer; }
    .vehicle-segment span { max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .panel, .metric-panel { border: 1px solid #383a43; border-radius: 21px; background: transparent; box-shadow: none; }
    .active-shift-panel { padding: 16px; }
    .active-shift-panel.inactive .shift-details { grid-template-columns: 58px minmax(0, 1fr); }
    .active-shift-panel.inactive .vehicle-detail { display: none; }
    .active-shift-panel.inactive .panel-chevron { display: none; }
    .shift-details { display: grid; grid-template-columns: 58px 1fr 1fr 18px; align-items: center; gap: 13px; margin-bottom: 16px; }
    .shift-details.interactive { cursor: pointer; border-radius: 14px; outline: none; }
    .shift-details.interactive:focus-visible { box-shadow: 0 0 0 3px var(--wf-primary-soft); }
    .shift-orb { width: 58px; height: 58px; display: grid; place-items: center; border-radius: 50%; background: #ef182b; color: #fff; }
    .shift-orb ion-icon { font-size: 29px; }
    .shift-detail { min-width: 0; padding-right: 10px; }
    .shift-detail span { display: block; margin-bottom: 6px; color: #aaaab1; font-size: 12px; }
    .shift-detail strong { display: block; overflow: hidden; color: #f5f5f6; font-size: clamp(16px,4.5vw,21px); text-overflow: ellipsis; white-space: nowrap; }
    .shift-detail small { display: block; max-width: 360px; margin-top: 5px; color: var(--wf-muted); font-size: 11px; line-height: 1.4; }
    .vehicle-detail { padding-left: 14px; border-left: 1px solid #32343b; }
    .panel-chevron { color: #f4f4f5; font-size: 24px; }
    .vehicle-inventory { margin: -2px 0 16px; padding: 12px 13px; border: 1px solid var(--wf-border); border-radius: 14px; background: var(--wf-accent-surface); }
    .vehicle-inventory-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .vehicle-inventory-heading span { display: inline-flex; align-items: center; gap: 6px; color: var(--wf-muted); font-size: 11px; font-weight: 750; }
    .vehicle-inventory-heading ion-icon { color: var(--wf-primary); font-size: 16px; }
    .vehicle-inventory-heading strong { color: var(--wf-text); font-size: 12px; white-space: nowrap; }
    .vehicle-inventory-track { height: 7px; margin-top: 9px; overflow: hidden; border-radius: 999px; background: var(--wf-border); }
    .vehicle-inventory-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--wf-primary), var(--wf-primary-tint)); }
    .vehicle-inventory small { display: block; margin-top: 6px; color: var(--wf-muted); font-size: 10px; text-align: right; }
    .primary-dashboard-button, .outline-dashboard-button { width: 100%; min-height: 50px; border-radius: 11px; color: #fff; font: inherit; font-size: 15px; font-weight: 800; cursor: pointer; }
    .primary-dashboard-button { border: 0; background: linear-gradient(180deg,#f51d31,#e80e23); box-shadow: 0 9px 22px rgba(238,20,40,.18); }
    .primary-dashboard-button:disabled { opacity: .55; }
    .metric-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 10px; }
    .metric-panel { min-width: 0; min-height: 184px; padding: 15px 13px; display: flex; flex-direction: column; align-items: flex-start; }
    .metric-icon { width: 38px; height: 38px; margin-bottom: 14px; display: grid; place-items: center; border-radius: 50%; background: #21171b; color: #f21d2f; }
    .metric-icon ion-icon { font-size: 20px; }
    .metric-panel > span { min-height: 31px; color: #adaeb5; font-size: 11px; line-height: 1.35; }
    .metric-panel > strong { display: block; margin: 7px 0 10px; color: #f5f5f7; font-size: clamp(22px,6vw,31px); line-height: 1; white-space: nowrap; letter-spacing: -.04em; }
    .metric-panel > strong small { color: #c4c4c8; font-size: .54em; font-weight: 500; letter-spacing: -.02em; }
    .metric-panel p { margin: auto 0 0; color: #b5b6bc; font-size: 11px; line-height: 1.35; }
    .metric-panel p b { color: #f21d2f; }
    .metric-panel .progress-track { width: 100%; height: 8px; margin: 1px 0 10px; overflow: hidden; border-radius: 99px; background: #292b31; }
    .metric-panel .progress-track span { display: block; height: 100%; border-radius: inherit; background: #f21d2f; }
    .metric-panel .complete-pill { padding: 7px 9px; border-radius: 999px; background: #eaf8f1; color: #1c7e52; font-weight: 750; }
    .metric-panel.shortfall p b { color: #ffb347; }
    .delivery-panel { padding: 17px; }
    .delivery-panel.clickable { cursor: pointer; }
    .section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 17px; }
    .section-heading h2 { margin: 0; font-size: 20px; letter-spacing: -.025em; }
    .section-heading a { color: #f21d2f; font-size: 13px; font-weight: 750; text-decoration: none; }
    .job-identity { display: grid; grid-template-columns: 48px 1fr 22px; align-items: center; gap: 13px; }
    .job-sequence { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 12px; background: #f21d2f; color: #fff; font-size: 24px; font-weight: 700; }
    .job-identity div:nth-child(2) { min-width: 0; }
    .job-identity strong { display: block; overflow: hidden; color: #f6f6f7; font-size: 18px; text-overflow: ellipsis; white-space: nowrap; }
    .job-identity p { margin: 5px 0 0; overflow: hidden; color: #a8a9af; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .job-identity > ion-icon { color: var(--wf-primary); font-size: 24px; }
    .delivery-facts { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); margin: 19px 0; }
    .delivery-facts > div { min-width: 0; padding: 0 10px; display: grid; grid-template-columns: auto 1fr; align-items: center; column-gap: 7px; border-right: 1px solid #30323a; }
    .delivery-facts > div:first-child { padding-left: 0; }
    .delivery-facts > div:last-child { padding-right: 0; border-right: 0; }
    .delivery-facts ion-icon { grid-row: 1 / span 2; color: #f21d2f; font-size: 21px; }
    .delivery-facts strong { overflow: hidden; color: #f2f2f4; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
    .delivery-facts span { color: #8f9097; font-size: 10px; }
    .outline-dashboard-button { border: 1px solid #f21d2f; background: transparent; color: #f21d2f; }
    .empty-delivery { min-height: 190px; display: grid; justify-items: center; align-content: center; text-align: center; }
    .empty-icon { width: 60px; height: 60px; margin-bottom: 15px; display: grid; place-items: center; border-radius: 50%; background: var(--wf-primary-soft); color: var(--wf-primary); }
    .empty-icon ion-icon { font-size: 29px; }
    .empty-delivery strong { font-size: 18px; }
    .empty-delivery p { max-width: 280px; margin: 8px 0 0; color: #9c9da3; font-size: 12px; line-height: 1.5; }

    /* Keep the compact dashboard layout while using the same theme and surface
       system as every other driver screen. */
    :host { background: var(--wf-background); color: var(--wf-text); }
    .driver-dashboard { padding-top: 18px; background: var(--wf-background); color: var(--wf-text); }
    .panel, .metric-panel, .status-strip {
      border-color: var(--wf-border);
      background: transparent;
      box-shadow: none;
    }
    .dashboard-loading { color: var(--wf-muted); }
    .dashboard-error { border-color: color-mix(in srgb, var(--wf-danger) 35%, var(--wf-border)); background: color-mix(in srgb, var(--wf-danger) 9%, var(--wf-surface)); color: var(--wf-text); }
    .dashboard-error button { color: var(--wf-danger); }
    .status-segment { color: var(--wf-muted); border-color: var(--wf-border); }
    .status-segment strong { color: var(--wf-muted); }
    .status-segment ion-icon { color: var(--wf-primary); }
    .status-segment.active strong { color: var(--wf-success); }
    .status-segment.break strong { color: var(--wf-warning); }
    .status-segment.active .live-dot { background: var(--wf-success); }
    .status-segment.break .live-dot { background: var(--wf-warning); }
    .shift-orb { background: var(--wf-primary); }
    .shift-detail span, .metric-panel > span, .metric-panel p, .job-identity p,
    .delivery-facts span, .empty-delivery p { color: var(--wf-muted); }
    .shift-detail strong, .panel-chevron, .metric-panel > strong, .job-identity strong,
    .delivery-facts strong, .empty-delivery strong { color: var(--wf-text); }
    .job-identity > ion-icon { color: var(--wf-primary); }
    .vehicle-detail, .delivery-facts > div { border-color: var(--wf-border); }
    .primary-dashboard-button { background: linear-gradient(180deg, var(--wf-primary-tint), var(--wf-primary)); }
    .metric-icon { background: var(--wf-primary-soft); color: var(--wf-primary); }
    .metric-panel > strong small { color: var(--wf-muted); }
    .metric-panel p b, .section-heading a { color: var(--wf-primary); }
    .metric-panel .progress-track { background: var(--wf-accent-surface); }
    .metric-panel .progress-track span { background: var(--wf-primary); }
    .metric-panel .complete-pill { background: #eaf8f1; color: #1c7e52; }
    .job-sequence { background: var(--wf-primary); }
    .delivery-facts ion-icon { color: var(--wf-primary); }
    .outline-dashboard-button { border-color: var(--wf-primary); color: var(--wf-primary); }
    .empty-icon { background: var(--wf-primary-soft); color: var(--wf-primary); }
    @media (max-width: 520px) {
      .driver-dashboard { padding-right: 13px; padding-left: 13px; }
      .shift-details { grid-template-columns: 50px 1fr 1fr 15px; gap: 9px; }
      .shift-orb { width: 50px; height: 50px; }
      .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .metric-panel:first-child { grid-column: 1 / -1; min-height: 154px; }
      .metric-panel { min-height: 176px; padding: 13px 10px; }
      .metric-icon { margin-bottom: 11px; }
      .delivery-facts > div { padding: 0 6px; column-gap: 4px; }
      .delivery-facts ion-icon { font-size: 18px; }
      .delivery-facts strong { font-size: 11px; }
    }
  `],
})
export class DashboardPage implements OnDestroy {
  private readonly api = inject(DriverApiService);
  readonly state = inject(DriverStateService);
  private readonly workflow = inject(DriverWorkflowService);
  readonly notifications = inject(DriverNotificationService);
  private readonly router = inject(Router);

  readonly profile = signal<DriverProfile | null>(null);
  readonly activeShift = signal<DriverShift | null>(null);
  readonly jobs = signal<DriverJob[]>([]);
  readonly nextJobSequence = signal(0);
  readonly dashboardLoading = signal(true);
  readonly dashboardError = signal('');
  readonly hasLoaded = signal(false);
  readonly now = signal(Date.now());
  readonly summary = signal<DriverDashboardSummary>({
    plannedJobs: 0,
    completedJobs: 0,
    plannedGallons: 0,
    deliveredGallons: 0,
  });
  readonly activeJob = computed(() =>
    this.jobs().find(job => ['started', 'arrived', 'equipment_verified', 'fueled', 'proof_submitted'].includes(job.status)) ?? null);
  readonly nextJob = computed(() => this.jobs().find(job => job.status === 'assigned') ?? null);
  readonly displayedJob = computed(() => this.activeJob() ?? this.nextJob());
  private readonly clockTimer = window.setInterval(() => this.now.set(Date.now()), 30_000);

  ionViewWillEnter(): void {
    void this.loadDashboard();
    void this.notifications.refresh();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.clockTimer);
  }

  async loadDashboard(): Promise<void> {
    if (this.dashboardLoading() && this.hasLoaded()) return;
    this.dashboardLoading.set(true);
    this.dashboardError.set('');
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    try {
      const [profile, shift, dashboardJobs, summary] = await Promise.all([
        firstValueFrom(this.api.getCurrentDriver()),
        firstValueFrom(this.api.getActiveShift()),
        firstValueFrom(this.api.getDashboardJobs()),
        firstValueFrom(this.api.getDashboardSummary(start, end)),
      ]);
      this.profile.set(profile);
      this.activeShift.set(shift);
      this.applyDashboardJobs(dashboardJobs);
      this.summary.set(summary);
      this.hasLoaded.set(true);
    } catch {
      this.dashboardError.set('Dashboard data could not be loaded. Check your connection and try again.');
    } finally {
      this.dashboardLoading.set(false);
    }
  }

  async refreshDashboard(request: RefreshRequest): Promise<void> {
    try {
      await Promise.all([this.loadDashboard(), this.notifications.refresh()]);
    } finally {
      request.complete();
    }
  }

  private applyDashboardJobs(value: DriverDashboardJobs): void {
    this.jobs.set([value.activeJob, value.nextJob].filter((job): job is DriverJob => !!job));
    this.nextJobSequence.set(value.nextJobSequence);
  }

  get badgeLabel(): string {
    return this.notifications.unreadCount() > 99 ? '99+' : String(this.notifications.unreadCount());
  }

  get currentVehiclePlate(): string {
    const vehicle = this.activeShift()?.vehicle;
    return vehicle?.licensePlate || vehicle?.unitNumber || 'Not selected';
  }

  get vehicleInventoryPercent(): number {
    const vehicle = this.activeShift()?.vehicle;
    if (!vehicle || Number(vehicle.capacityGallons) <= 0) return 0;
    return Math.min(100, Math.max(0,
      Math.round(Number(vehicle.inventoryGallons) / Number(vehicle.capacityGallons) * 100)));
  }

  get greeting(): string {
    const hour = new Date(this.now()).getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }

  get isShiftPaused(): boolean {
    return this.activeShift()?.status === 'on_break';
  }

  get isShiftActive(): boolean {
    return !!this.activeShift() && !this.isShiftPaused;
  }

  get jobStatusLabel(): string {
    return this.activeJob() ? 'Job Started' : 'Job Not Started';
  }

  get shiftStatusLabel(): string {
    if (!this.activeShift()) return 'Shift Not Started';
    return this.isShiftPaused ? 'Shift Paused' : 'Shift Active';
  }

  get displayedJobSequence(): number {
    return this.activeJob() ? 1 : Math.max(1, this.nextJobSequence());
  }

  get shiftDuration(): string {
    const shift = this.activeShift();
    if (!shift) return '0h 00m';
    const currentBreakMinutes = shift.breakStartedAt
      ? Math.max(0, Math.floor((this.now() - new Date(shift.breakStartedAt).getTime()) / 60000)) : 0;
    const minutes = Math.max(0, Math.floor((this.now() - new Date(shift.startedAt).getTime()) / 60000)
      - shift.breakMinutes - currentBreakMinutes);
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  }

  get shiftActionLabel(): string {
    if (!this.activeShift()) return 'Start shift';
    if (!this.activeShift()?.vehicleId) return 'Select vehicle';
    return 'Open active shift';
  }

  get deliveryProgress(): number {
    const planned = Number(this.summary().plannedGallons);
    return planned <= 0 ? 0 : Math.min(100, Math.max(0, Number(this.summary().deliveredGallons) / planned * 100));
  }

  get remainingGallons(): number {
    return Math.max(0, Number(this.summary().plannedGallons) - Number(this.summary().deliveredGallons));
  }

  get fuelShortfall(): number {
    const vehicle = this.activeShift()?.vehicle;
    if (!vehicle) return 0;
    return Math.max(0, this.remainingGallons - Number(vehicle.inventoryGallons));
  }

  async handleShiftAction(): Promise<void> {
    if (!this.activeShift()) {
      if (await this.workflow.startShift()) await this.loadDashboard();
      return;
    }
    if (!this.activeShift()?.vehicleId) {
      if (await this.workflow.selectAssignedVehicle()) await this.loadDashboard();
      return;
    }
    await this.router.navigateByUrl('/active-shift');
  }

  advanceDisplayedJob(event: Event): void {
    event.stopPropagation();
    const job = this.displayedJob();
    if (!job) return;
    if (job.status === 'assigned') {
      void this.router.navigate(['/jobs', job.id]);
      return;
    }
    void this.router.navigate(['/jobs', job.id]);
  }
}
