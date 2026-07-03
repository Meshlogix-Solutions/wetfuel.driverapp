import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonCard, IonCardContent, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonItem, IonSelect,
  IonSelectOption, IonTextarea, IonCheckbox, IonButton
} from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-incident',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MobileShellComponent,
    IonCard, IonCardContent, IonIcon, IonSegment, IonSegmentButton, IonLabel, IonItem, IonSelect,
    IonSelectOption, IonTextarea, IonCheckbox, IonButton
  ],
  template: `
<wf-mobile-shell title="Report incident" subtitle="Safety first" backRoute="/dashboard">
  <main class="screen-body stack">
    <ion-card class="wf-card danger-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="warning-outline"></ion-icon></div><div><strong>For immediate danger, call emergency services first.</strong><p class="caption" style="margin:4px 0 0">After the area is safe, record the incident below.</p></div></ion-card-content></ion-card>
    <section>
      <h2 class="section-title">Incident type</h2>
      <ion-segment [(ngModel)]="incidentType" scrollable>
        <ion-segment-button *ngFor="let type of types" [value]="type"><ion-label>{{ type }}</ion-label></ion-segment-button>
      </ion-segment>
    </section>
    <ion-item>
      <ion-select label="Severity" labelPlacement="stacked" [(ngModel)]="severity">
        <ion-select-option value="Minor — contained, no injury">Minor — contained, no injury</ion-select-option>
        <ion-select-option value="Moderate — manager attention required">Moderate — manager attention required</ion-select-option>
        <ion-select-option value="Critical — emergency response involved">Critical — emergency response involved</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item><ion-textarea label="What happened?" labelPlacement="stacked" [(ngModel)]="description" placeholder="Describe the incident, actions taken and current site condition..."></ion-textarea></ion-item>
    <section>
      <h2 class="section-title">Photos and evidence</h2>
      <div class="photo-grid">
        <button class="photo-box">＋<br>Add overview</button>
        <button class="photo-box">＋<br>Add close-up</button>
        <button class="photo-box">＋<br>Add document</button>
      </div>
    </section>
    <ion-card class="wf-card">
      <ion-card-content>
        <ion-item lines="none"><ion-checkbox slot="start"></ion-checkbox><ion-label class="ion-text-wrap"><strong>Area is safe and controlled</strong><p class="caption">Fuel flow stopped and ignition hazards removed.</p></ion-label></ion-item>
        <ion-item lines="none"><ion-checkbox slot="start"></ion-checkbox><ion-label class="ion-text-wrap"><strong>Supervisor has been contacted</strong><p class="caption">Franchise admin will receive an urgent alert.</p></ion-label></ion-item>
      </ion-card-content>
    </ion-card>
    <ion-button class="wf-button" color="tertiary" expand="block">Submit incident report</ion-button>
    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/dashboard">Save offline and return</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class IncidentPage {
  readonly types = ['Spill', 'Equipment', 'Vehicle', 'Injury', 'Site hazard', 'Other'];
  incidentType = 'Spill';
  severity = 'Minor — contained, no injury';
  description = '';
}
