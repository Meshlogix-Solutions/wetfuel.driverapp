import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonCard, IonCardContent, IonItem, IonInput, IonButton, IonIcon } from '@ionic/angular/standalone';
import { LoaderComponent } from '../shared/loader.component';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { DriverGeolocationService } from '../services/driver-geolocation.service';
import { DriverStateService } from '../services/driver-state.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-clock-in',
  standalone: true,
  imports: [MobileShellComponent, LoaderComponent, IonCard, IonCardContent, IonItem, IonInput, IonButton, IonIcon],
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
    <ion-button class="wf-button" color="tertiary" expand="block" [disabled]="submitting || state.busy()" (click)="clockIn()">
      @if (submitting || state.busy()) { <wf-loader mode="button" /> }
      {{ submitting ? 'Clocking in...' : 'Confirm clock in · ' + currentTime }}
    </ion-button>
    <p class="caption text-center">Your GPS location and time will be recorded for compliance.</p>
  </main>
</wf-mobile-shell>
  `
})
export class ClockInPage {
  latitude?:number;longitude?:number;accuracyMeters?:number;locationCaptured=false;locationStatus='Location will be requested when you clock in.';submitting=false;
  constructor(readonly state: DriverStateService, private readonly geo: DriverGeolocationService, private readonly router: Router, private readonly toast: ToastService, private readonly alerts: AlertController) {}
  get currentTime():string{return new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});}
  clockIn(): void {
    if (this.submitting) return;
    this.submitting = true;
    this.locationStatus='Capturing location...';
    void this.geo.getCurrentPosition().then(position => {
      this.latitude=position.latitude;
      this.longitude=position.longitude;
      this.accuracyMeters=position.accuracyMeters;
      this.locationCaptured=true;
      this.locationStatus=`Captured with approximately ${Math.round(position.accuracyMeters)} m accuracy.`;
      void this.finishClockIn();
    }).catch(error => {
      this.submitting = false;
      this.locationStatus=this.geo.friendlyError((error as Error).message);
      void this.toast.error(this.locationStatus);
    });
  }
  private async finishClockIn():Promise<void>{
    let clockedIn=await this.state.clockIn(undefined,this.latitude,this.longitude,this.accuracyMeters);
    if(!clockedIn&&this.state.syncError().includes('not on the depot site yet')){
      const alert=await this.alerts.create({
        header:'Outside depot site',
        message:'You are not on the depot site yet. Do you still want to clock in?',
        buttons:[{text:'Not yet',role:'cancel'},{text:'Clock in anyway',role:'confirm'}],
      });
      await alert.present();
      const result=await alert.onDidDismiss();
      if(result.role!=='confirm'){ this.submitting=false; return; }
      clockedIn=await this.state.clockIn(undefined,this.latitude,this.longitude,this.accuracyMeters,true);
    }
    this.submitting=false;
    if(clockedIn){
      const warning=this.state.syncWarnings()[0];
      if(warning)await this.toast.warning(warning.message);
      void this.router.navigateByUrl('/dashboard');
    }else void this.toast.error(this.state.syncError()||'Clock-in could not be completed.');
  }
}
