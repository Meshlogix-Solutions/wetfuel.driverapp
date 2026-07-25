import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonButton, IonRange } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-fueling',
  standalone: true,
  imports: [FormsModule, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonButton, IonRange],
  template: `
<wf-mobile-shell title="Fuel delivery" [subtitle]="state.selectedJob()?.equipmentName || 'Assigned equipment'" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/meter'">
  <main class="screen-body stack">
    <ion-card class="wf-card text-center">
      <ion-card-content>
        <span class="pill success"><span class="status-dot"></span>&nbsp;{{ fueling ? 'Fueling active' : 'Meter ready' }}</span>
        <div style="height:18px"></div>
        <div class="gauge" [style.--value]="percent + '%'"><div class="gauge-inner"><div><strong>{{ gallons }}</strong><div class="muted">of {{ targetGallons }} gal</div></div></div></div>
        <div style="height:15px"></div><strong>{{ fueling ? 'Fuel delivery in progress' : 'Ready to begin' }}</strong><p class="caption">Enter the confirmed delivered volume below.</p>
      </ion-card-content>
    </ion-card>
    <ion-button class="wf-button" [color]="fueling ? 'primary' : 'tertiary'" expand="block" (click)="toggleFueling()">{{ fueling ? 'Pause fuel flow' : 'Start fuel delivery' }}</ion-button>
    <div>
      <p class="caption" style="margin:0 0 4px">Delivered volume</p>
      <ion-range min="0" [max]="targetGallons" [(ngModel)]="gallons" [pin]="true"></ion-range>
    </div>
    <ion-button class="wf-button wf-secondary" expand="block" [disabled]="!canStop" (click)="stopAndRecord()">Stop and record delivery</ion-button>
    <ion-button class="wf-button" color="danger" fill="outline" expand="block" routerLink="/incident" [queryParams]="{jobId: state.selectedJob()?.id}">Emergency stop / report spill</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class FuelingPage {
  fueling = false;
  gallons = 0;
  constructor(readonly state: DriverStateService, private readonly router: Router) {
    this.gallons = Number(state.deliveredGallons() || 0);
  }
  get targetGallons(): number { return Number(this.state.selectedJob()?.targetGallons ?? 1); }
  get percent(): number { return Math.min(100, Math.round((Number(this.gallons) / this.targetGallons) * 100)); }
  get canStop(): boolean { return Number(this.gallons) > 0; }
  // Starting/pausing the fuel flow is just local UI state - the job status only moves to
  // 'fueled' once the driver actually stops and records the delivery, not while pumping.
  toggleFueling(): void {
    this.fueling = !this.fueling;
  }
  async stopAndRecord(): Promise<void> {
    const job = this.state.selectedJob();
    if (!job) return;
    if (!(await this.state.updateJob(job.id, 'fueled'))) return;
    this.fueling = false;
    this.state.setDeliveryVolume(Number(this.gallons));
    void this.router.navigate(['/jobs', job.id, 'delivery-proof']);
  }
}
