import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-hours',
  standalone: true,
  imports: [CommonModule, MobileShellComponent, IonCard, IonCardContent],
  template: `
    <wf-mobile-shell title="Hours and shifts" subtitle="This week" [showNav]="true">
      <main class="screen-body stack">
        <ion-card class="wf-card hero-card"><ion-card-content>
          <span class="pill dark">{{ weekLabel }}</span>
          <h2 style="font-size:42px;margin:18px 0 4px;letter-spacing:-.05em">{{ state.profile()?.hoursThisWeek ?? 0 }}h</h2>
          <p class="caption" style="margin:0">{{ remainingHours }}h remaining to 40 hours</p>
          <div style="height:15px"></div><div class="progress-track orange"><span [style.width.%]="progress"></span></div>
        </ion-card-content></ion-card>
        <section><h2 class="section-title">Recorded shifts</h2>
          @for (shift of state.shifts(); track shift.id) {
            <ion-card class="wf-card"><ion-card-content class="row">
              <div class="grow"><h3>{{ shift.startedAt | date:'fullDate' }}</h3><p class="caption">{{ shift.startedAt | date:'shortTime' }} – {{ shift.endedAt ? (shift.endedAt | date:'shortTime') : 'Active now' }} · {{ shift.breakMinutes }}m break</p></div>
              <strong>{{ shift.durationHours | number:'1.1-2' }}h</strong>
            </ion-card-content></ion-card>
          } @empty {
            <ion-card class="wf-card"><ion-card-content class="text-center">No shifts recorded this week.</ion-card-content></ion-card>
          }
        </section>
      </main>
    </wf-mobile-shell>
  `,
})
export class HoursPage {
  constructor(readonly state: DriverStateService) {}
  get remainingHours():number{return Math.max(0,Math.round((40-(this.state.profile()?.hoursThisWeek??0))*10)/10);}
  get progress():number{return Math.min(100,Math.round((this.state.profile()?.hoursThisWeek??0)/40*100));}
  get weekLabel():string{const now=new Date(),day=(now.getDay()+6)%7,start=new Date(now);start.setDate(now.getDate()-day);const end=new Date(start);end.setDate(start.getDate()+6);return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;}
}
