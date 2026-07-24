import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonCard, IonCardContent, IonItem, IonCheckbox, IonLabel, IonTextarea, IonButton
} from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { INSPECTION_ITEMS } from '../data/mock-data';
import { DriverStateService } from '../services/driver-state.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pre-trip',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MobileShellComponent,
    IonCard, IonCardContent, IonItem, IonCheckbox, IonLabel, IonTextarea, IonButton
  ],
  template: `
<wf-mobile-shell title="Pre-trip inspection" subtitle="Truck 14" backRoute="/vehicle">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card">
      <ion-card-content>
        <div class="row-between">
          <div>
            <span class="pill dark">Required before driving</span>
            <h2 style="margin:14px 0 5px">{{ completedCount }} of {{ items.length }} checked</h2>
            <p class="caption" style="margin:0">Inspect vehicle safety and delivery equipment.</p>
          </div>
          <strong style="font-size:32px">{{ progress }}%</strong>
        </div>
        <div style="height:14px"></div>
        <div class="progress-track"><span [style.width.%]="progress"></span></div>
      </ion-card-content>
    </ion-card>

    <ion-card class="wf-card">
      <ion-card-content>
        <ion-item *ngFor="let item of items; let i = index" lines="full">
          <ion-checkbox slot="start" [(ngModel)]="checks[i]"></ion-checkbox>
          <ion-label class="ion-text-wrap"><strong>{{ item[0] }}</strong><p class="caption">{{ item[1] }}</p></ion-label>
        </ion-item>
      </ion-card-content>
    </ion-card>

    <ion-item><ion-textarea label="Inspection notes" labelPlacement="stacked" placeholder="Describe defects or unusual conditions..."></ion-textarea></ion-item>

    <div class="photo-grid">
      <div class="photo-box">＋<br>Add front photo</div>
      <div class="photo-box">＋<br>Add rear photo</div>
      <div class="photo-box">＋<br>Add meter photo</div>
    </div>

    <ion-button class="wf-button" expand="block" [disabled]="completedCount !== items.length" (click)="submit()">Submit inspection</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class PreTripPage {
  readonly items = INSPECTION_ITEMS;
  checks = this.items.map(() => false);
  get completedCount(): number { return this.checks.filter(Boolean).length; }
  get progress(): number { return Math.round((this.completedCount / this.items.length) * 100); }
  constructor(private readonly state: DriverStateService, private readonly router: Router) {}
  async submit(): Promise<void> {
    const vehicleId = this.state.selectedVehicleId();
    if (!vehicleId || this.completedCount !== this.items.length) return;
    const checklist = Object.fromEntries(this.items.map((item, index) => [item[0], this.checks[index]]));
    if (!(await this.state.submitInspection(vehicleId, checklist))) return;
    void this.router.navigateByUrl('/jobs');
  }
}
