import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule, MobileShellComponent, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
<wf-mobile-shell [title]="'Job ' + (state.selectedJob()?.jobNumber ?? '')" [subtitle]="statusLabel" backRoute="/jobs">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card">
      <ion-card-content>
        <span class="pill dark">Scheduled · {{ state.selectedJob()?.scheduledAt | date:'short' }}</span>
        <h1 style="margin:16px 0 5px;font-size:28px">{{ state.selectedJob()?.customerName }}</h1>
        <p class="caption" style="margin:0">{{ state.selectedJob()?.siteAddress }}</p>
      </ion-card-content>
    </ion-card>
    <section class="job-metrics">
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Target</span><strong>{{ state.selectedJob()?.targetGallons ?? 0 }}</strong><span class="caption">gallons</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Fuel</span><strong>{{ fuelLabel }}</strong><span class="caption">Fuel type</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Equipment</span><strong style="font-size:18px">{{ state.selectedJob()?.equipmentCode ?? '—' }}</strong><span class="caption">{{ state.selectedJob()?.equipmentType ?? 'Equipment' }}</span></ion-card-content></ion-card>
    </section>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <h2 class="section-title">Site contact</h2>
        <div class="row"><div class="avatar">{{ contactInitials }}</div><div class="grow"><strong>{{ state.selectedJob()?.siteContactName || 'Site contact not provided' }}</strong><p class="caption" style="margin:4px 0 0">{{ state.selectedJob()?.siteContactPhone || state.selectedJob()?.customerPhone || 'No phone number provided' }}</p></div>@if(state.selectedJob()?.siteContactPhone || state.selectedJob()?.customerPhone){<ion-button fill="outline" shape="round" [href]="'tel:' + (state.selectedJob()?.siteContactPhone || state.selectedJob()?.customerPhone)"><ion-icon slot="icon-only" name="call-outline"></ion-icon></ion-button>}</div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <h2 class="section-title">Delivery instructions</h2>
        <div class="row"><div class="icon-tile"><ion-icon name="lock-closed-outline"></ion-icon></div><div><strong>Site instructions</strong><p class="caption" style="margin:4px 0 0">{{ state.selectedJob()?.deliveryInstructions || 'No special delivery instructions.' }}</p></div></div>
        <div class="row"><div class="icon-tile"><ion-icon name="camera-outline"></ion-icon></div><div><strong>Delivery proof required</strong><p class="caption" style="margin:4px 0 0">Record the meter and equipment evidence before completion.</p></div></div>
      </ion-card-content>
    </ion-card>
    @if(state.selectedJob()?.safetyNote){<ion-card class="wf-card warning-card"><ion-card-content><strong>Safety note</strong><p class="caption" style="margin:6px 0 0">{{ state.selectedJob()?.safetyNote }}</p></ion-card-content></ion-card>}
    @if(state.syncError()){<ion-card class="wf-card danger-card"><ion-card-content><strong>Action required</strong><p class="caption" style="margin:6px 0 0">{{state.syncError()}}</p></ion-card-content></ion-card>}
    <ion-button class="wf-button" color="tertiary" expand="block" (click)="continueJob()">{{ actionLabel }}</ion-button>
  </main>
</wf-mobile-shell>
  `,
  styles: [`
    .job-metrics { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px; }
    .job-metrics ion-card:last-child { grid-column:1 / -1; }
    .job-metrics .metric { min-width:0; }
    .job-metrics .metric strong {
      min-width:0;font-size:18px!important;line-height:1.15!important;
      overflow-wrap:anywhere;word-break:break-word;
    }
    .job-metrics ion-card:first-child .metric strong { font-size:26px!important; }
    .job-metrics ion-card:last-child .metric strong {
      font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:16px!important;
    }
    @media (min-width:520px) {
      .job-metrics { grid-template-columns:repeat(3,minmax(0,1fr)); }
      .job-metrics ion-card:last-child { grid-column:auto; }
    }
  `]
})
export class JobDetailsPage {
  constructor(readonly state: DriverStateService, private readonly router: Router) {}
  get statusLabel(): string { return this.label(this.state.selectedJob()?.status || 'assigned'); }
  get fuelLabel(): string { return this.label(this.state.selectedJob()?.fuelType || 'Not specified'); }
  get contactInitials(): string { return (this.state.selectedJob()?.siteContactName || 'SC').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase(); }
  get actionLabel(): string {
    const status = this.state.selectedJob()?.status;
    return ({ assigned:'Start job and navigate', started:'Continue navigation', arrived:'Scan assigned equipment', equipment_verified:'Connect delivery meter', fueled:'Continue to delivery proof', proof_submitted:'Review delivery summary', completed:'View delivery history' } as Record<string,string>)[status || 'assigned'] || 'Continue job';
  }
  async continueJob(): Promise<void> {
    const job = this.state.selectedJob();
    if (!job) return;
    const currentStatus = job.status;
    if (currentStatus === 'assigned' && !(await this.state.updateJob(job.id, 'started'))) return;
    const route = ({ assigned:'route-map', started:'route-map', arrived:'qr-scanner', equipment_verified:'meter', fueled:'delivery-proof', proof_submitted:'delivery-summary' } as Record<string,string>)[currentStatus];
    if (currentStatus === 'completed') { void this.router.navigateByUrl('/history'); return; }
    if (!route) { void this.router.navigateByUrl('/jobs'); return; }
    void this.router.navigate(['/jobs', job.id, route]);
  }
  private label(value:string):string{return value.replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase());}
}
