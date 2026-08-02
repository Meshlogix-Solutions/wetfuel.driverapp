import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonCard, IonCardContent, IonItem, IonInput, IonButton, IonIcon } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverStateService } from '../services/driver-state.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-clock-in',
  standalone: true,
  imports: [MobileShellComponent, IonCard, IonCardContent, IonItem, IonInput, IonButton, IonIcon],
  template: `
<wf-mobile-shell title="Clock in" subtitle="Shift setup" backRoute="/dashboard">
  <main class="screen-body stack">
    <section class="map-mock">
      <div class="map-pin" style="left:46%;top:40%"><span>●</span></div><div class="route-line"></div>
      <ion-card class="wf-card compact" style="position:absolute;z-index:3;left:14px;right:14px;bottom:14px;margin:0">
        <ion-card-content>
          <div class="row-between"><div><strong>Shift location</strong><p class="caption" style="margin:4px 0 0">{{ locationStatus }}</p></div><span class="pill" [class.success]="locationCaptured">{{ locationCaptured ? 'Captured' : 'Required' }}</span></div>
        </ion-card-content>
      </ion-card>
    </section>
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <div class="row"><div class="icon-tile"><ion-icon name="location-outline"></ion-icon></div><div><strong>Device location</strong><p class="caption" style="margin:4px 0 0">{{ locationStatus }}</p></div></div>
        <div class="row"><div class="icon-tile"><ion-icon name="wifi-outline"></ion-icon></div><div><strong>Connection available</strong><p class="caption" style="margin:4px 0 0">Shift start will sync immediately.</p></div></div>
        <ion-item><ion-input label="Optional shift note" labelPlacement="stacked" placeholder="Example: Picking up Truck 14"></ion-input></ion-item>
      </ion-card-content>
    </ion-card>
    <ion-button class="wf-button" color="tertiary" expand="block" (click)="clockIn()">Confirm clock in · {{ currentTime }}</ion-button>
    <p class="caption text-center">Your GPS location and time will be recorded for compliance.</p>
  </main>
</wf-mobile-shell>
  `
})
export class ClockInPage {
  latitude?:number;longitude?:number;accuracyMeters?:number;locationCaptured=false;locationStatus='Location will be requested when you clock in.';
  constructor(private readonly state: DriverStateService, private readonly router: Router, private readonly toast: ToastService) {}
  get currentTime():string{return new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}
  clockIn(): void {
    if(!navigator.geolocation){this.locationStatus='Location is unavailable on this device.';void this.toast.error(this.locationStatus);return;}
    this.locationStatus='Capturing location...';
    navigator.geolocation.getCurrentPosition(
      position=>{this.latitude=position.coords.latitude;this.longitude=position.coords.longitude;this.accuracyMeters=position.coords.accuracy;this.locationCaptured=position.coords.accuracy<=200;this.locationStatus=this.locationCaptured?`Captured with approximately ${Math.round(position.coords.accuracy)} m accuracy.`:'GPS accuracy is too low. Move to an open area and try again.';if(this.locationCaptured)void this.finishClockIn();},
      ()=>{this.locationStatus='Location permission is required to clock in.';void this.toast.error(this.locationStatus);},
      {enableHighAccuracy:true,timeout:10000,maximumAge:30000},
    );
  }
  private async finishClockIn():Promise<void>{if(await this.state.clockIn(undefined,this.latitude,this.longitude,this.accuracyMeters))void this.router.navigateByUrl('/dashboard');else void this.toast.error(this.state.syncError()||'Clock-in could not be completed.');}
}
