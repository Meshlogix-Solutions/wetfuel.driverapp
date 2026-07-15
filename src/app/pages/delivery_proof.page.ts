import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonItem, IonInput, IonTextarea, IonCheckbox, IonLabel, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-delivery-proof',
  standalone: true,
  imports: [FormsModule, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonItem, IonInput, IonTextarea, IonCheckbox, IonLabel, IonButton],
  template: `
<wf-mobile-shell title="Delivery proof" subtitle="186 gallons captured" backRoute="/fueling">
  <main class="screen-body stack">
    <ion-card class="wf-card soft-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="checkmark-circle-outline"></ion-icon></div><div><strong>Meter delivery saved</strong><p class="caption" style="margin:4px 0 0">LCR transaction 7782-070326-0918</p></div></ion-card-content></ion-card>
    <section>
      <h2 class="section-title">Required photos</h2>
      <div class="photo-grid">
        <button class="photo-box filled">📷<br>Meter photo<br><strong>Added</strong></button>
        <button class="photo-box filled">📷<br>Equipment photo<br><strong>Added</strong></button>
        <button class="photo-box">＋<br>Add site photo</button>
      </div>
    </section>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <h2 class="section-title">Meter readings</h2>
        <div class="grid-2">
          <ion-item><ion-input label="Starting totalizer" labelPlacement="stacked" value="58,449.3"></ion-input></ion-item>
          <ion-item><ion-input label="Ending totalizer" labelPlacement="stacked" value="58,635.3"></ion-input></ion-item>
        </div>
        <ion-item><ion-input label="Delivered volume" labelPlacement="stacked" value="186.0 gallons" [readonly]="true"></ion-input></ion-item>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content>
        <ion-item lines="full">
          <ion-checkbox slot="start" [checked]="true"></ion-checkbox>
          <ion-label class="ion-text-wrap"><strong>No leaks or spills observed</strong><p class="caption">Hose disconnected and caps secured.</p></ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-checkbox slot="start"></ion-checkbox>
          <ion-label class="ion-text-wrap"><strong>Customer/site contact notified</strong><p class="caption">Delivery completion communicated.</p></ion-label>
        </ion-item>
      </ion-card-content>
    </ion-card>
    <ion-item><ion-textarea label="Driver notes" labelPlacement="stacked" [(ngModel)]="notes" placeholder="Delivery completed without issue..."></ion-textarea></ion-item>
    <ion-button class="wf-button" expand="block" routerLink="/delivery-summary">Review delivery summary</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class DeliveryProofPage implements OnInit {
  notes = 'Delivery completed safely. Generator tank and surrounding area inspected.';
  constructor(private readonly state: DriverStateService) {}
  ngOnInit(): void {
    const job = this.state.selectedJob();
    if (job) this.state.updateJob(job.id, 'proof_pending');
  }
}
