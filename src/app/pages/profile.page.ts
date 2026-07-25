import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverApiService, DriverProfile, DriverShift } from '../services/driver-api.service';
import { DriverAuthService } from '../services/driver-auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, DatePipe, MobileShellComponent, IonCard, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Driver profile" subtitle="WetFuel Dallas North" [showNav]="true">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card">
      <ion-card-content class="row">
        <div class="avatar" style="width:66px;height:66px;font-size:20px;background:#fff">{{ initials }}</div>
        <div class="grow">
          <h2 style="margin:0 0 5px">{{ profile()?.firstName }} {{ profile()?.lastName }}</h2>
          <div style="height:8px"></div>
          <span class="pill dark">Active driver</span>
        </div>
      </ion-card-content>
    </ion-card>

    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <h2 class="section-title">Compliance documents</h2>
        <div class="row"><div class="icon-tile"><ion-icon name="card-outline"></ion-icon></div><div class="grow"><strong>{{ profile()?.license?.type }} License</strong><p class="caption" style="margin:4px 0 0">Expires {{ profile()?.license?.expiryDate | date }}</p></div></div>
        @for (certificate of profile()?.certifications ?? []; track certificate.id) {
          <div class="row"><div class="icon-tile"><ion-icon name="shield-checkmark-outline"></ion-icon></div><div class="grow"><strong>{{ certificate.name }}</strong><p class="caption" style="margin:4px 0 0">Expires {{ certificate.expiryDate | date }}</p></div><span class="pill" [class.warning]="certificate.status !== 'valid'" [class.success]="certificate.status === 'valid'">{{ certificate.status }}</span></div>
        }
      </ion-card-content>
    </ion-card>

    <ion-list inset="true">
      <ion-item button routerLink="/active-shift"><ion-icon name="truck-outline" slot="start"></ion-icon><ion-label><h3>Assigned vehicles</h3><p>{{ vehicleLabel() }}</p></ion-label></ion-item>
      <ion-item button><ion-icon name="notifications-outline" slot="start"></ion-icon><ion-label>Notification preferences</ion-label></ion-item>
      <ion-item button><ion-icon name="help-circle-outline" slot="start"></ion-icon><ion-label>Help and support</ion-label></ion-item>
    </ion-list>

    <ion-button class="wf-button wf-secondary" expand="block" (click)="logout()"><ion-icon slot="start" name="log-out-outline"></ion-icon>Sign out</ion-button>
    <p class="caption text-center">WetFuel Driver v1.0.0 · Tenant WF-001</p>
  </main>
</wf-mobile-shell>
  `
})
export class ProfilePage {
  private readonly api = inject(DriverApiService);
  private readonly auth = inject(DriverAuthService);

  readonly profile = signal<DriverProfile | null>(null);
  readonly activeShift = signal<DriverShift | null>(null);

  constructor() {
    this.api.getCurrentDriver().subscribe({ next: p => this.profile.set(p) });
    this.api.getActiveShift().subscribe({ next: s => this.activeShift.set(s) });
  }

  get initials(): string {
    const profile = this.profile();
    return profile ? `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`.toUpperCase() : '';
  }
  vehicleLabel(): string {
    const shiftVehicle = this.activeShift()?.vehicle;
    if (shiftVehicle) return [shiftVehicle.name, shiftVehicle.make, shiftVehicle.model].filter(Boolean).join(' · ');
    const assigned = this.profile()?.assignedVehicles ?? [];
    if (assigned.length === 1) return assigned[0].name;
    if (assigned.length > 1) return `${assigned.length} vehicles available`;
    return 'No vehicle assigned';
  }
  logout(): void { void this.auth.logout(); }
}
