import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonIcon, IonInput, IonItem } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { BluetoothMeterService, NearbyMeter, meterError } from '../services/bluetooth-meter.service';
import { DriverCacheService } from '../services/driver-cache.service';
import { DriverStateService } from '../services/driver-state.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-meter',
  standalone: true,
  imports: [FormsModule, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton, IonItem, IonInput],
  template: `
<wf-mobile-shell title="Connect fuel meter" subtitle="Delivery meter" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/equipment'">
  <main class="screen-body stack">
    <ion-card class="wf-card hero-card text-center">
      <ion-card-content>
        <div class="icon-tile" style="margin:0 auto 12px"><ion-icon name="bluetooth-outline"></ion-icon></div>
        <span class="pill" [class.success]="meter.connected()" [class.warning]="!meter.connected()">{{ meter.connected() ? 'Reading' : 'Not connected' }}</span>
        <h2 style="margin:14px 0 6px">{{ meterName() }}</h2>
        <p class="caption" style="margin:0">{{ meter.connected() && meter.productName() ? meter.productName() : vehicleLabel() }}</p>
      </ion-card-content>
    </ion-card>

    @if (meter.android) {
      <ion-card class="wf-card">
        <ion-card-content class="stack">
          <ion-item lines="none">
            <ion-input label="Register number" labelPlacement="stacked" type="number" inputmode="numeric" min="1" max="250" [(ngModel)]="node" [disabled]="meter.connected() || meter.connecting()"></ion-input>
          </ion-item>
          <p class="caption" style="margin:0">Leave this at 250 unless the register uses a different number.</p>
          <div class="row-between"><span class="caption">Meter status</span><strong>{{ meter.connected() ? meter.detail() : 'Scan for the register' }}</strong></div>
          <div class="row-between"><span class="caption">Vehicle</span><strong>{{ vehicleLabel() }}</strong></div>
        </ion-card-content>
      </ion-card>

      @if (!meter.connected()) {
        <ion-button class="wf-button" color="tertiary" expand="block" [disabled]="meter.scanning() || meter.connecting()" (click)="scan()">
          <ion-icon slot="start" name="search-outline"></ion-icon>
          {{ meter.scanning() ? 'Scanning…' : 'Scan for register' }}
        </ion-button>
        @if (!meter.devices().length) {
          <ion-card class="wf-card warning-card"><ion-card-content><strong>Find the register</strong><p class="caption" style="margin:6px 0 0">On the LCR.iQ, leave Bluetooth on and set to LCP mode. Then tap Scan and choose the register. Start and stop the delivery on the register. This phone only reads the gallons.</p></ion-card-content></ion-card>
        }
        @for (device of meter.devices(); track device.address) {
          <ion-card class="wf-card selection-card" (click)="connect(device)">
            <ion-card-content class="row">
              <div class="icon-tile"><ion-icon name="bluetooth-outline"></ion-icon></div>
              <div class="grow">
                <h3>{{ device.name }}</h3>
                <p class="caption">{{ device.address }}</p>
              </div>
              <strong>{{ meter.connectingAddress() === device.address ? 'Connecting…' : 'Connect' }}</strong>
            </ion-card-content>
          </ion-card>
        }
      } @else {
        <ion-card class="wf-card text-center">
          <ion-card-content>
            <p class="caption" style="margin:0">Gross gallons</p>
            <strong class="live-read">{{ meter.formatGallons(meter.gross()) }}</strong>
            @if (meter.net() !== null) { <p class="caption" style="margin:6px 0 0">Net {{ meter.formatGallons(meter.net()) }} gal</p> }
            <p class="caption" style="margin:8px 0 0">{{ meter.detail() }}</p>
          </ion-card-content>
        </ion-card>
        <ion-button class="wf-button" expand="block" [routerLink]="['/jobs', state.selectedJob()?.id, 'fueling']">Start fueling</ion-button>
        <ion-button class="wf-button" fill="outline" color="medium" expand="block" [disabled]="meter.connecting()" (click)="disconnect()">Disconnect</ion-button>
      }
    } @else {
      <ion-card class="wf-card warning-card"><ion-card-content><strong>Android meter link</strong><p class="caption" style="margin:6px 0 0">Bluetooth to the LCR register works on the Android app. This browser preview cannot reach the meter.</p></ion-card-content></ion-card>
      <ion-button class="wf-button" expand="block" [routerLink]="['/jobs', state.selectedJob()?.id, 'fueling']" (click)="state.connectMeter()">Continue with manual volume</ion-button>
    }
  </main>
</wf-mobile-shell>
  `,
  styles: [`
    .live-read { display: block; margin-top: 4px; font-size: 42px; line-height: 1.1; letter-spacing: -0.04em; }
    .selection-card h3 { margin: 0 0 2px; font-size: 16px; }
  `],
})
export class MeterPage {
  private readonly cache = inject(DriverCacheService);
  private readonly toast = inject(ToastService);
  readonly state = inject(DriverStateService);
  readonly meter = inject(BluetoothMeterService);
  readonly activeShift = this.cache.activeShift;
  node: number | string = 250;

  ionViewWillEnter(): void {
    void this.cache.refreshIfOnline();
  }

  readonly meterName = () => this.meter.connected()
    ? (this.meter.deviceName() || this.activeShift()?.vehicle?.meterIdentifier || 'LCR register')
    : (this.activeShift()?.vehicle?.meterIdentifier || 'Delivery meter');

  readonly vehicleLabel = () => {
    const vehicle = this.activeShift()?.vehicle;
    return vehicle ? [vehicle.name, vehicle.make, vehicle.model].filter(Boolean).join(' · ') : 'No vehicle selected';
  };

  async scan(): Promise<void> {
    try {
      const devices = await this.meter.scan();
      if (!devices.length) {
        void this.toast.error('No register found. On the register, open Wireless and leave Bluetooth on, then scan again.');
      }
    } catch (error) {
      void this.toast.error(meterError(error));
    }
  }

  async connect(device: NearbyMeter): Promise<void> {
    if (this.meter.connecting()) return;
    try {
      await this.meter.connect(device, Math.trunc(Number(this.node)));
    } catch (error) {
      void this.toast.error(meterError(error));
    }
  }

  async disconnect(): Promise<void> {
    await this.meter.disconnect();
  }
}
