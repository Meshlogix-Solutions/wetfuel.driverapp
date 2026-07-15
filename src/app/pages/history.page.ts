import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton, IonCard, IonCardContent, IonIcon, IonInput, IonItem
} from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MobileShellComponent,
    IonCard, IonCardContent, IonIcon, IonItem, IonInput, IonButton
  ],
  template: `
<wf-mobile-shell title="Delivery history" subtitle="Completed jobs" backRoute="/dashboard">
  <main class="screen-body stack">
    <section class="grid-2">
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Recent</span><strong>{{ state.recentDeliveries().length }}</strong><span class="caption">deliveries</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Delivered</span><strong>{{ deliveredGallons }}</strong><span class="caption">gallons</span></ion-card-content></ion-card>
    </section>
    <ion-item><ion-input label="Search history" labelPlacement="stacked" placeholder="Customer, job ID or equipment"></ion-input></ion-item>
    <section>
      <h2 class="section-title">Recent deliveries</h2>
      <ion-card *ngFor="let delivery of state.recentDeliveries()" class="wf-card">
        <ion-card-content class="row">
          <div class="icon-tile"><ion-icon name="checkmark-circle-outline"></ion-icon></div>
          <div class="grow">
            <div class="row-between"><h3>{{ delivery.customerName }}</h3><span class="pill success">Synced</span></div>
            <p class="caption">{{ delivery.jobNumber }} · {{ delivery.equipmentName ?? 'Equipment' }}</p>
            <p><strong>{{ delivery.deliveredGallons }} gal</strong> · {{ delivery.completedAt | date:'short' }}</p>
          </div>
        </ion-card-content>
      </ion-card>
      <ion-card *ngIf="state.recentDeliveries().length === 0" class="wf-card">
        <ion-card-content class="text-center">No completed deliveries yet.</ion-card-content>
      </ion-card>
    </section>
    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/jobs">Back to assigned jobs</ion-button>
  </main>
</wf-mobile-shell>
  `,
})
export class HistoryPage {
  constructor(readonly state: DriverStateService) {}
  get deliveredGallons(): number {
    return this.state.recentDeliveries().reduce(
      (sum, delivery) => sum + Number(delivery.deliveredGallons), 0);
  }
}
