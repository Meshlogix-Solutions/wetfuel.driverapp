import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';
import { DriverApiService, DriverProfile, DriverShift } from '../services/driver-api.service';
import { LoaderComponent } from '../shared/loader.component';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-hours',
  standalone: true,
    imports: [CommonModule, MobileShellComponent, LoaderComponent, IonCard, IonCardContent],
  template: `
    <wf-mobile-shell title="Hours and shifts" subtitle="This week" [showNav]="true">
      <main class="screen-body stack">
        @if (!profile()) {
          <wf-loader mode="section" message="Loading hours..." />
        } @else {
        <ion-card class="wf-card hero-card"><ion-card-content>
          <span class="pill dark">{{ weekLabel }}</span>
          <h2 style="font-size:42px;margin:18px 0 4px;letter-spacing:-.05em">{{ profile()?.hoursThisWeek ?? 0 }}h</h2>
          <p class="caption" style="margin:0">{{ remainingHours }}h remaining to 40 hours</p>
          <div style="height:15px"></div><div class="progress-track orange"><span [style.width.%]="progress"></span></div>
        </ion-card-content></ion-card>
        <section><h2 class="section-title">Recorded shifts</h2>
          @for (shift of shifts(); track shift.id) {
            <ion-card class="wf-card"><ion-card-content class="row">
              <div class="grow"><h3>{{ shift.startedAt | date:'fullDate' }}</h3><p class="caption">{{ shift.startedAt | date:'shortTime' }} – {{ shift.endedAt ? (shift.endedAt | date:'shortTime') : 'Active now' }} · {{ shift.breakMinutes }}m break</p></div>
              <strong>{{ shift.durationHours | number:'1.1-2' }}h</strong>
            </ion-card-content></ion-card>
          } @empty {
            <ion-card class="wf-card"><ion-card-content class="text-center">No shifts recorded this week.</ion-card-content></ion-card>
          }
        </section>
        }
      </main>
    </wf-mobile-shell>
  `,
})
export class HoursPage {
  private readonly api = inject(DriverApiService);
  readonly profile = signal<DriverProfile | null>(null);
  readonly shifts = signal<DriverShift[]>([]);

  constructor() {
    this.api.getCurrentDriver().subscribe({ next: p => this.profile.set(p) });
    this.api.getShifts().subscribe({ next: s => this.shifts.set(s) });
  }

  get remainingHours():number{return Math.max(0,Math.round((40-(this.profile()?.hoursThisWeek??0))*10)/10);}
  get progress():number{return Math.min(100,Math.round((this.profile()?.hoursThisWeek??0)/40*100));}
  get weekLabel():string{const now=new Date(),day=(now.getDay()+6)%7,start=new Date(now);start.setDate(now.getDate()-day);const end=new Date(start);end.setDate(start.getDate()+6);return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;}
}
