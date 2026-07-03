import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-active-shift',
  standalone: true,
  imports: [RouterLink, MobileShellComponent, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Active shift" subtitle="On duty" backRoute="/dashboard">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card text-center">
      <ion-card-content>
        <span class="pill dark">{{ state.paused() ? 'Paused' : 'On duty' }}</span>
        <div style="font-size:52px;font-weight:950;letter-spacing:-.05em;margin:18px 0 5px">03:42:18</div>
        <p class="caption" style="margin:0">Started at 7:28 AM · Dallas North Depot</p>
      </ion-card-content>
    </ion-card>
    <section class="grid-2">
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Drive time</span><strong>01:54</strong><span class="caption">hours</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Deliveries</span><strong>1 / 5</strong><span class="caption">completed</span></ion-card-content></ion-card>
    </section>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <div class="row"><div class="icon-tile"><ion-icon name="truck-outline"></ion-icon></div><div><strong>{{ state.selectedVehicle() }}</strong><p class="caption" style="margin:4px 0 0">Unit WF-DAL-014 · 64% truck inventory</p></div></div>
        <div class="progress-track"><span style="width:64%"></span></div>
        <ion-button class="wf-button wf-secondary" expand="block" routerLink="/jobs">Continue today's jobs</ion-button>
      </ion-card-content>
    </ion-card>
    <div class="grid-2">
      <ion-button class="wf-button wf-secondary" expand="block" (click)="state.togglePause()">{{ state.paused() ? 'Resume shift' : 'Pause shift' }}</ion-button>
      <ion-button class="wf-button" color="danger" expand="block" (click)="clockOut()">Clock out</ion-button>
    </div>
  </main>
</wf-mobile-shell>
  `
})
export class ActiveShiftPage {
  constructor(readonly state: DriverStateService, private readonly router: Router) {}
  clockOut(): void { this.state.clockOut(); void this.router.navigateByUrl('/dashboard'); }
}
