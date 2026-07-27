import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCheckbox, IonItem, IonLabel, IonTextarea } from '@ionic/angular/standalone';
import { INSPECTION_ITEMS } from '../data/mock-data';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-pre-trip',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileShellComponent, IonCard, IonCardContent, IonItem, IonCheckbox, IonLabel, IonTextarea, IonButton],
  template: `
<wf-mobile-shell title="Pre-job checklist" [subtitle]="'Job ' + (state.selectedJob()?.jobNumber ?? '')" [backRoute]="'/jobs/' + jobId + '/vehicle-confirmation'">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card"><ion-card-content><div class="row-between"><div><span class="pill dark">Required for every job</span><h2 style="margin:14px 0 5px">{{ completedCount }} of {{ items.length }} checked</h2><p class="caption" style="margin:0">Inspect the confirmed vehicle before starting this delivery.</p></div><strong style="font-size:32px">{{ progress }}%</strong></div><div style="height:14px"></div><div class="progress-track"><span [style.width.%]="progress"></span></div></ion-card-content></ion-card>
    <ion-card class="wf-card"><ion-card-content><ion-item *ngFor="let item of items; let i = index" lines="full" button="true" (click)="toggleItem(i)"><ion-checkbox slot="start" [checked]="checks[i]" (click)="$event.stopPropagation(); toggleItem(i)"></ion-checkbox><ion-label class="ion-text-wrap"><strong>{{ item[0] }}</strong><p class="caption">{{ item[1] }}</p></ion-label></ion-item></ion-card-content></ion-card>
    <ion-item><ion-textarea label="Inspection notes" labelPlacement="stacked" [(ngModel)]="notes" placeholder="Describe defects or unusual conditions..."></ion-textarea></ion-item>
    <ion-button class="wf-button" expand="block" [disabled]="completedCount !== items.length || state.busy()" (click)="submit()">Complete checklist and start job</ion-button>
  </main>
</wf-mobile-shell>
  `,
})
export class PreTripPage {
  readonly state = inject(DriverStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly items = INSPECTION_ITEMS;
  readonly jobId = this.route.snapshot.paramMap.get('jobId') ?? '';
  checks = this.items.map(() => false);
  notes = '';

  ionViewWillEnter(): void {
    this.checks = this.items.map(() => false);
    this.notes = '';
  }

  get completedCount(): number { return this.checks.filter(Boolean).length; }
  get progress(): number { return Math.round((this.completedCount / this.items.length) * 100); }

  toggleItem(index: number): void {
    this.checks[index] = !this.checks[index];
  }

  async submit(): Promise<void> {
    const vehicleId = this.state.selectedVehicleId();
    if (!this.jobId || !vehicleId || this.completedCount !== this.items.length) return;
    const checklist = Object.fromEntries(this.items.map((item, index) => [item[0], this.checks[index]]));
    if (!(await this.state.submitInspection(this.jobId, vehicleId, checklist, this.notes))) return;
    if (!(await this.state.updateJob(this.jobId, 'started', { vehicleId }))) return;
    void this.router.navigate(['/jobs', this.jobId, 'route-map']);
  }
}
