import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonRange } from '@ionic/angular/standalone';
import { BluetoothMeterService } from '../services/bluetooth-meter.service';
import { DriverStateService } from '../services/driver-state.service';
import { ToastService } from '../services/toast.service';
import { LoaderComponent } from '../shared/loader.component';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-fueling',
  standalone: true,
  imports: [FormsModule, RouterLink, MobileShellComponent, LoaderComponent, IonCard, IonCardContent, IonButton, IonRange],
  template: `
<wf-mobile-shell title="Fuel delivery" [subtitle]="state.selectedJob()?.equipmentName || 'Assigned equipment'" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/meter'">
  <main class="screen-body stack">
    @if (meter.android && !meter.connected()) {
      <ion-card class="wf-card warning-card">
        <ion-card-content>
          <strong>Meter not connected</strong>
          <p class="caption" style="margin:6px 0 0">Scan and connect the LCR register before fueling. The phone reads the live gallons. Start and stop the delivery on the register.</p>
        </ion-card-content>
      </ion-card>
      <ion-button class="wf-button" expand="block" [routerLink]="['/jobs', state.selectedJob()?.id, 'meter']">Connect the meter</ion-button>
    } @else if (meter.android) {
      <ion-card class="wf-card text-center">
        <ion-card-content>
          <span class="pill" [class.success]="meter.deliveryStatus() !== 'idle'" [class.warning]="meter.deliveryStatus() === 'idle'">
            <span class="status-dot"></span>&nbsp;{{ meter.detail() }}
          </span>
          <div style="height:18px"></div>
          <div class="gauge" [style.--value]="percent + '%'">
            <div class="gauge-inner">
              <div>
                <strong>{{ meter.formatGallons(meter.gross()) }}</strong>
                <div class="muted">of {{ targetGallons }} gal</div>
              </div>
            </div>
          </div>
          @if (meter.net() !== null) { <p class="caption" style="margin:12px 0 0">Net {{ meter.formatGallons(meter.net()) }} gal</p> }
          <div style="height:15px"></div>
          <strong>{{ meter.productName() || meter.deviceName() }}</strong>
          <p class="caption">Start and stop the delivery on the register. This screen follows the live gross gallons.</p>
        </ion-card-content>
      </ion-card>
      <ion-button class="wf-button wf-secondary" expand="block" [disabled]="!canStop || state.busy()" (click)="stopAndRecord()">
        @if (state.busy()) { <wf-loader mode="button" /> }
        Stop and record delivery
      </ion-button>
    } @else {
      <ion-card class="wf-card text-center">
        <ion-card-content>
          <span class="pill success"><span class="status-dot"></span>&nbsp;{{ fueling ? 'Fueling active' : 'Meter ready' }}</span>
          <div style="height:18px"></div>
          <div class="gauge" [style.--value]="percent + '%'"><div class="gauge-inner"><div><strong>{{ gallons }}</strong><div class="muted">of {{ targetGallons }} gal</div></div></div></div>
          <div style="height:15px"></div><strong>{{ fueling ? 'Fuel delivery in progress' : 'Ready to begin' }}</strong><p class="caption">Browser preview only. Enter the confirmed delivered volume below. The Android app reads this from the register.</p>
        </ion-card-content>
      </ion-card>
      <ion-button class="wf-button" [color]="fueling ? 'primary' : 'tertiary'" expand="block" (click)="toggleFueling()">{{ fueling ? 'Pause fuel flow' : 'Start fuel delivery' }}</ion-button>
      <div>
        <p class="caption" style="margin:0 0 4px">Delivered volume</p>
        <ion-range min="0" [max]="targetGallons" [(ngModel)]="gallons" [pin]="true"></ion-range>
      </div>
      <ion-button class="wf-button wf-secondary" expand="block" [disabled]="!canStop || state.busy()" (click)="stopAndRecord()">
        @if (state.busy()) { <wf-loader mode="button" /> }
        Stop and record delivery
      </ion-button>
    }
    <ion-button class="wf-button" color="danger" fill="outline" expand="block" routerLink="/incident" [queryParams]="{jobId: state.selectedJob()?.id}">Emergency stop / report spill</ion-button>
  </main>
</wf-mobile-shell>
  `,
  styles: [`
    .gauge-inner strong { font-size: clamp(22px, 8vw, 40px); }
  `],
})
export class FuelingPage {
  fueling = false;
  gallons = 0;

  constructor(
    readonly state: DriverStateService,
    readonly meter: BluetoothMeterService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {
    this.gallons = Number(state.deliveredGallons() || 0);
  }

  get targetGallons(): number { return Number(this.state.selectedJob()?.targetGallons || 1); }
  get shownGallons(): number {
    if (!(this.meter.android && this.meter.connected())) return Number(this.gallons);
    const raw = Number(this.meter.gross() ?? 0);
    return Number(raw.toFixed(Math.min(4, Math.max(0, this.meter.decimals()))));
  }
  get percent(): number {
    const target = this.targetGallons;
    if (!(target > 0)) return 0;
    return Math.min(100, Math.round((this.shownGallons / target) * 100));
  }
  get canStop(): boolean { return this.shownGallons > 0; }

  toggleFueling(): void {
    this.fueling = !this.fueling;
  }

  async stopAndRecord(): Promise<void> {
    const job = this.state.selectedJob();
    if (!job || !this.canStop) return;
    const delivered = this.shownGallons;
    if (!(await this.state.updateJob(job.id, 'fueled', { deliveredGallons: delivered }))) {
      void this.toast.error(this.state.consumeSyncError('The delivery could not be recorded.'));
      return;
    }
    this.fueling = false;
    this.state.setDeliveryVolume(delivered);
    void this.router.navigate(['/jobs', job.id, 'delivery-proof']);
  }
}
