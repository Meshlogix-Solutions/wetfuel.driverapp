import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonButton, IonRange } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-fueling',
  standalone: true,
  imports: [FormsModule, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonButton, IonRange],
  template: `
<wf-mobile-shell title="Fuel delivery" [subtitle]="state.selectedJob()?.equipmentName || 'Assigned equipment'" backRoute="/meter">
  <main class="screen-body stack">
    <ion-card class="wf-card text-center">
      <ion-card-content>
        <span class="pill success"><span class="status-dot"></span>&nbsp;{{ fueling ? 'Fueling active' : 'Meter ready' }}</span>
        <div style="height:18px"></div>
        <div class="gauge" [style.--value]="percent + '%'"><div class="gauge-inner"><div><strong>{{ gallons }}</strong><div class="muted">of {{ targetGallons }} gal</div></div></div></div>
        <div style="height:15px"></div><strong>{{ fueling ? '22.4 gallons/min' : 'Ready to begin' }}</strong><p class="caption">LCR-II 7782 · Live volume capture</p>
      </ion-card-content>
    </ion-card>
    <section class="grid-3">
      <ion-card class="wf-card compact text-center"><ion-card-content><span class="caption">Start totalizer</span><strong style="display:block;margin-top:5px">58,449.3</strong></ion-card-content></ion-card>
      <ion-card class="wf-card compact text-center"><ion-card-content><span class="caption">Current</span><strong style="display:block;margin-top:5px">58,635.3</strong></ion-card-content></ion-card>
      <ion-card class="wf-card compact text-center"><ion-card-content><span class="caption">Elapsed</span><strong style="display:block;margin-top:5px">08:18</strong></ion-card-content></ion-card>
    </section>
    <ion-button class="wf-button" [color]="fueling ? 'primary' : 'tertiary'" expand="block" (click)="toggleFueling()">{{ fueling ? 'Pause fuel flow' : 'Start fuel delivery' }}</ion-button>
    <div>
      <p class="caption" style="margin:0 0 4px">Manual demo volume</p>
      <ion-range min="0" [max]="targetGallons" [(ngModel)]="gallons" [pin]="true"></ion-range>
    </div>
    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/delivery-proof">Stop and record delivery</ion-button>
    <ion-button class="wf-button" color="danger" fill="outline" expand="block" routerLink="/incident">Emergency stop / report spill</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class FuelingPage {
  fueling = false;
  gallons = 0;
  constructor(readonly state: DriverStateService) {
    this.gallons = Number(state.selectedJob()?.targetGallons ?? 0);
  }
  get targetGallons(): number { return Number(this.state.selectedJob()?.targetGallons ?? 1); }
  get percent(): number { return Math.min(100, Math.round((Number(this.gallons) / this.targetGallons) * 100)); }
  toggleFueling(): void {
    this.fueling = !this.fueling;
    if (this.fueling) {
      const job = this.state.selectedJob();
      if (job) this.state.updateJob(job.id, 'fueling');
    }
  }
}
