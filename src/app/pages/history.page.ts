import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AlertController, IonButton, IonCard, IonCardContent, IonCheckbox, IonIcon, IonInput, IonItem, IonLabel
} from '@ionic/angular/standalone';
import { DriverApiService, DriverDelivery } from '../services/driver-api.service';
import { ConnectivityService } from '../services/connectivity.service';
import { OfflineStoreService, LocalJobRecord } from '../services/offline-store.service';
import { OfflineSyncService } from '../services/offline-sync.service';
import { ToastService } from '../services/toast.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MobileShellComponent,
    IonCard, IonCardContent, IonIcon, IonItem, IonInput, IonButton, IonCheckbox, IonLabel,
  ],
  template: `
<wf-mobile-shell title="Delivery history" [subtitle]="subtitle" [showNav]="true">
  <main class="screen-body stack">
    <section class="grid-2">
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Pending</span><strong>{{ pendingJobs().length }}</strong><span class="caption">to sync</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Delivered</span><strong>{{ deliveredGallons }}</strong><span class="caption">gallons</span></ion-card-content></ion-card>
    </section>

    <ion-item><ion-input label="Search" labelPlacement="stacked" [(ngModel)]="query" placeholder="Customer, job ID or equipment"></ion-input></ion-item>

    @if (!connectivity.online()) {
      <ion-card class="wf-card warning-card">
        <ion-card-content>
          <strong>Offline</strong>
          <p class="caption" style="margin:4px 0 0">Connect to the internet to sync selected jobs.</p>
        </ion-card-content>
      </ion-card>
    }

    @if (sync.syncing()) {
      <ion-card class="wf-card">
        <ion-card-content>
          <strong>Syncing...</strong>
          <p class="caption" style="margin:4px 0 0">Uploading photos and posting job events.</p>
        </ion-card-content>
      </ion-card>
    }

    <section>
      <div class="row-between" style="align-items:center">
        <h2 class="section-title" style="margin:0">Waiting to sync</h2>
        @if (pendingJobs().length) {
          <button type="button" class="caption" style="background:none;border:0;color:var(--wf-primary);font-weight:800" (click)="toggleAllPending()">
            {{ allPendingSelected ? 'Clear' : 'Select all' }}
          </button>
        }
      </div>

      @for (record of filteredPending; track record.job.id) {
        <ion-card class="wf-card">
          <ion-card-content>
            <ion-item lines="none" button="true" (click)="toggleJob(record.job.id)">
              <ion-checkbox slot="start" [checked]="isSelected(record.job.id)" (click)="$event.stopPropagation(); toggleJob(record.job.id)"></ion-checkbox>
              <ion-label class="ion-text-wrap">
                <div class="row-between">
                  <h3 style="margin:0">{{ record.job.customerName }}</h3>
                  <span class="pill warning">Pending sync</span>
                </div>
                <p class="caption">{{ record.job.jobNumber }} · {{ record.job.equipmentName || record.job.siteName }}</p>
                <p><strong>{{ record.job.fueledGallons || record.job.targetGallons }} gal</strong> · {{ statusLabel(record.job.status) }}</p>
              </ion-label>
            </ion-item>
          </ion-card-content>
        </ion-card>
      } @empty {
        <ion-card class="wf-card">
          <ion-card-content class="text-center">No jobs are waiting to sync.</ion-card-content>
        </ion-card>
      }

      @if (pendingJobs().length) {
        <ion-button class="wf-button" color="tertiary" expand="block"
          [disabled]="!selectedIds().length || !connectivity.online() || sync.syncing()"
          (click)="syncSelected()">
          Sync selected ({{ selectedIds().length }})
        </ion-button>
        <ion-button class="wf-button wf-secondary" expand="block"
          [disabled]="!connectivity.online() || sync.syncing()"
          (click)="syncAll()">
          Sync all pending
        </ion-button>
      }
    </section>

    <section>
      <h2 class="section-title">Recent deliveries</h2>
      @for (delivery of filteredDeliveries; track delivery.id) {
        <ion-card class="wf-card">
          <ion-card-content class="row">
            <div class="icon-tile"><ion-icon name="checkmark-circle-outline"></ion-icon></div>
            <div class="grow">
              <div class="row-between"><h3>{{ delivery.customerName }}</h3><span class="pill success">Synced</span></div>
              <p class="caption">{{ delivery.jobNumber }} · {{ delivery.equipmentName ?? 'Equipment' }}</p>
              <p><strong>{{ delivery.deliveredGallons }} gal</strong> · {{ delivery.completedAt | date:'short' }}</p>
            </div>
          </ion-card-content>
        </ion-card>
      }
      @if (!filteredDeliveries.length) {
        <ion-card class="wf-card">
          <ion-card-content class="text-center">No completed deliveries yet.</ion-card-content>
        </ion-card>
      }
    </section>
    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/jobs">Back to assigned jobs</ion-button>
  </main>
</wf-mobile-shell>
  `,
})
export class HistoryPage {
  private readonly api = inject(DriverApiService);
  private readonly store = inject(OfflineStoreService);
  readonly sync = inject(OfflineSyncService);
  readonly connectivity = inject(ConnectivityService);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);

  readonly recentDeliveries = signal<DriverDelivery[]>([]);
  readonly pendingJobs = signal<LocalJobRecord[]>([]);
  readonly selectedIds = signal<string[]>([]);
  query = '';

  ionViewWillEnter(): void {
    void this.reload();
  }

  get subtitle(): string {
    const pending = this.pendingJobs().length;
    return pending ? `${pending} waiting to sync` : 'Completed jobs';
  }

  get deliveredGallons(): number {
    return this.recentDeliveries().reduce(
      (sum, delivery) => sum + Number(delivery.deliveredGallons), 0);
  }

  get filteredPending(): LocalJobRecord[] {
    return this.pendingJobs().filter(record => this.matches(record.job.customerName, record.job.jobNumber, record.job.equipmentName, record.job.siteName));
  }

  get filteredDeliveries(): DriverDelivery[] {
    return this.recentDeliveries().filter(delivery => this.matches(delivery.customerName, delivery.jobNumber, delivery.equipmentName));
  }

  get allPendingSelected(): boolean {
    const ids = this.filteredPending.map(record => record.job.id);
    return ids.length > 0 && ids.every(id => this.selectedIds().includes(id));
  }

  isSelected(jobId: string): boolean {
    return this.selectedIds().includes(jobId);
  }

  toggleJob(jobId: string): void {
    const current = this.selectedIds();
    this.selectedIds.set(current.includes(jobId) ? current.filter(id => id !== jobId) : [...current, jobId]);
  }

  toggleAllPending(): void {
    if (this.allPendingSelected) {
      this.selectedIds.set([]);
      return;
    }
    this.selectedIds.set(this.filteredPending.map(record => record.job.id));
  }

  async syncSelected(): Promise<void> {
    await this.runSync(this.selectedIds());
  }

  async syncAll(): Promise<void> {
    await this.runSync(this.pendingJobs().map(record => record.job.id));
  }

  statusLabel(status: string): string {
    return status.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  private async runSync(jobIds: string[]): Promise<void> {
    if (!jobIds.length) {
      void this.toast.error('Select at least one job to sync.');
      return;
    }
    if (!this.connectivity.online()) {
      void this.toast.error('Connect to the internet to sync jobs.');
      return;
    }

    const synced: string[] = [];
    const failed: Array<{ jobId: string; error: string }> = [];

    for (const jobId of jobIds) {
      let result = await this.sync.flushJob(jobId);
      if (!result.success && result.needsArrivalConfirm) {
        const confirmed = await this.confirmOutsideArrival();
        if (!confirmed) {
          failed.push({ jobId, error: 'Arrival was not confirmed for sync.' });
          continue;
        }
        await this.sync.confirmOutsideArrival(jobId);
        result = await this.sync.flushJob(jobId);
      }
      if (result.success) synced.push(jobId);
      else failed.push({ jobId, error: result.error ?? 'Sync failed.' });
    }

    await this.reload();
    this.selectedIds.set(this.selectedIds().filter(id => !synced.includes(id)));

    if (failed.length && !synced.length) {
      void this.toast.error(failed[0].error);
      return;
    }
    if (failed.length) {
      void this.toast.error(`${synced.length} synced. ${failed.length} still pending: ${failed[0].error}`);
      return;
    }
    void this.toast.success(synced.length === 1 ? 'Job synced.' : `${synced.length} jobs synced.`);
  }

  private async confirmOutsideArrival(): Promise<boolean> {
    const alert = await this.alerts.create({
      header: 'Outside customer site',
      message: 'The arrival GPS for this job is outside the customer site boundary. Do you still want to sync it as arrived?',
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        { text: 'Sync anyway', role: 'confirm' },
      ],
    });
    await alert.present();
    const result = await alert.onDidDismiss();
    return result.role === 'confirm';
  }

  private async reload(): Promise<void> {
    await this.sync.refreshPendingJobs();
    this.pendingJobs.set(await this.store.getPendingSyncJobs());
    this.api.getRecentDeliveries().subscribe({
      next: deliveries => this.recentDeliveries.set(deliveries),
      error: () => this.recentDeliveries.set([]),
    });
  }

  private matches(...values: Array<string | undefined>): boolean {
    const needle = this.query.trim().toLowerCase();
    if (!needle) return true;
    return values.some(value => value?.toLowerCase().includes(needle));
  }
}
