import { Component } from '@angular/core';
import { IonCard, IonCardContent, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-hours',
  standalone: true,
  imports: [MobileShellComponent, IonCard, IonCardContent, IonButton],
  template: `
<wf-mobile-shell title="Hours and shifts" subtitle="This week" [showNav]="true">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card">
      <ion-card-content>
        <span class="pill dark">Jun 29 – Jul 5</span>
        <h2 style="font-size:42px;margin:18px 0 4px;letter-spacing:-.05em">34h 18m</h2>
        <p class="caption" style="margin:0">5h 42m remaining to 40 hours</p>
        <div style="height:15px"></div>
        <div class="progress-track orange"><span style="width:86%"></span></div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content>
        <div class="row-between"><h2 class="section-title">Daily hours</h2><span class="pill success">On track</span></div>
        <div class="bar-chart">
          <div class="bar-column"><div class="bar" style="height:76%"></div><span>Mon</span></div>
          <div class="bar-column"><div class="bar" style="height:88%"></div><span>Tue</span></div>
          <div class="bar-column"><div class="bar" style="height:82%"></div><span>Wed</span></div>
          <div class="bar-column"><div class="bar" style="height:94%"></div><span>Thu</span></div>
          <div class="bar-column"><div class="bar" style="height:48%"></div><span>Fri</span></div>
          <div class="bar-column"><div class="bar" style="height:6%"></div><span>Sat</span></div>
          <div class="bar-column"><div class="bar" style="height:6%"></div><span>Sun</span></div>
        </div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile">F</div><div class="grow"><h3>Friday, July 3</h3><p class="caption">7:28 AM – Active now</p></div><strong>3h 42m</strong></ion-card-content></ion-card>
    <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile">T</div><div class="grow"><h3>Thursday, July 2</h3><p class="caption">7:12 AM – 4:36 PM · 32m break</p></div><strong>8h 52m</strong></ion-card-content></ion-card>
    <ion-card class="wf-card"><ion-card-content class="row"><div class="icon-tile">W</div><div class="grow"><h3>Wednesday, July 1</h3><p class="caption">7:34 AM – 4:03 PM · 30m break</p></div><strong>7h 59m</strong></ion-card-content></ion-card>
    <ion-button class="wf-button wf-secondary" expand="block">Request hour correction</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class HoursPage {

}
