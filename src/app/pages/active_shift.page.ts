import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';

@Component({
  selector: 'app-active-shift',
  standalone: true,
  imports: [DatePipe, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Active shift" subtitle="On duty" backRoute="/dashboard">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card text-center">
      <ion-card-content>
        <span class="pill dark">{{ state.paused() ? 'Paused' : 'On duty' }}</span>
        <div style="font-size:52px;font-weight:950;letter-spacing:-.05em;margin:18px 0 5px">{{ duration }}</div>
        <p class="caption" style="margin:0">Started {{ state.activeShift()?.startedAt | date:'short' }}</p>
      </ion-card-content>
    </ion-card>
    <section class="grid-2">
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">On-duty time</span><strong>{{ duration }}</strong><span class="caption">excluding breaks</span></ion-card-content></ion-card>
      <ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Deliveries</span><strong>{{ completedToday }} / {{ todayJobs }}</strong><span class="caption">completed today</span></ion-card-content></ion-card>
    </section>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <div class="row"><div class="icon-tile"><ion-icon name="truck-outline"></ion-icon></div><div><strong>{{ state.selectedVehicle() }}</strong><p class="caption" style="margin:4px 0 0">{{ vehicleSummary }}</p></div></div>
        <div class="progress-track"><span [style.width.%]="inventoryPercent"></span></div>
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
  get duration():string{const shift=this.state.activeShift();if(!shift)return '0h 00m';const minutes=Math.max(0,Math.floor((Date.now()-new Date(shift.startedAt).getTime())/60000)-shift.breakMinutes);return `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,'0')}m`;}
  get todayJobs():number{return this.state.jobs().filter(job=>this.isToday(job.scheduledAt)&&job.status!=='cancelled').length;}
  get completedToday():number{return this.state.jobs().filter(job=>this.isToday(job.scheduledAt)&&job.status==='completed').length;}
  get vehicle(){return this.state.vehicles().find(item=>item.id===this.state.selectedVehicleId());}
  get inventoryPercent():number{const v=this.vehicle;return v&&v.capacityGallons>0?Math.round(v.inventoryGallons/v.capacityGallons*100):0;}
  get vehicleSummary():string{return this.vehicle?`Unit ${this.vehicle.unitNumber} · ${this.inventoryPercent}% truck inventory`:'No vehicle selected';}
  private isToday(value:string):boolean{return new Date(value).toDateString()===new Date().toDateString();}
  clockOut(): void { this.state.clockOut(); void this.router.navigateByUrl('/dashboard'); }
}
