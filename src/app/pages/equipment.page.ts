import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCheckbox, IonIcon, IonItem, IonLabel } from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-equipment', standalone: true,
  imports: [MobileShellComponent, IonCard, IonCardContent, IonIcon, IonItem, IonCheckbox, IonLabel, IonButton],
  template: `
<wf-mobile-shell title="Confirm equipment" subtitle="QR scan successful" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/qr-scanner'"><main class="screen-body stack">
  <ion-card class="wf-card text-center"><ion-card-content><div class="success-orb"><ion-icon name="checkmark-circle-outline"></ion-icon></div><span class="pill success">Equipment matched</span><h2>{{ state.verifiedEquipment()?.name || state.selectedJob()?.equipmentName || 'Assigned equipment' }}</h2><p class="caption">QR: {{ state.verifiedEquipment()?.qrCode || state.selectedJob()?.equipmentQrCode || 'Not provided' }}</p></ion-card-content></ion-card>
  <ion-card class="wf-card"><ion-card-content><div class="photo-box filled" style="min-height:180px;font-size:16px">{{ state.verifiedEquipment()?.photoUrl ? 'Equipment reference photo available' : 'No reference photo provided' }}</div><hr class="divider"><div class="detail-row"><span>Customer</span><strong>{{ state.verifiedEquipment()?.customerName || state.selectedJob()?.customerName || '—' }}</strong></div><div class="detail-row"><span>Site</span><strong>{{ state.verifiedEquipment()?.siteName || state.selectedJob()?.siteName || '—' }}</strong></div><div class="detail-row"><span>Fuel type</span><strong>{{ state.verifiedEquipment()?.fuelType || state.selectedJob()?.fuelType || '—' }}</strong></div><div class="detail-row"><span>Capacity</span><strong>{{ state.verifiedEquipment()?.capacityGallons || state.selectedJob()?.equipmentCapacityGallons || 0 }} gallons</strong></div><div class="detail-row"><span>Serial</span><strong>{{ state.verifiedEquipment()?.serialNumber || '—' }}</strong></div><div class="detail-row"><span>Access notes</span><strong>{{ state.verifiedEquipment()?.accessNotes || '—' }}</strong></div></ion-card-content></ion-card>
  <ion-card class="wf-card warning-card"><ion-card-content><strong>Driver check</strong><p class="caption">Confirm the QR label and reference details match the physical asset before connecting the hose.</p><ion-item lines="none" button="true" (click)="confirmed=!confirmed"><ion-checkbox slot="start" [checked]="confirmed" (click)="$event.stopPropagation(); confirmed=!confirmed"></ion-checkbox><ion-label class="ion-text-wrap"><strong>Equipment identity confirmed</strong><p class="caption">Equipment condition appears safe for fueling.</p></ion-label></ion-item></ion-card-content></ion-card>
  <ion-button class="wf-button" expand="block" [disabled]="!confirmed" (click)="confirm()">Continue to meter connection</ion-button><ion-button class="wf-button" color="danger" fill="outline" expand="block" (click)="mismatch()">Equipment does not match</ion-button>
</main></wf-mobile-shell>`
})
export class EquipmentPage {
  confirmed=false;
  constructor(readonly state:DriverStateService,private readonly router:Router){}
  async confirm():Promise<void>{const job=this.state.selectedJob();if(!job)return;if(!(await this.state.updateJob(job.id,'equipment_verified')))return;void this.router.navigate(['/jobs',job.id,'meter']);}
  mismatch():void{const job=this.state.selectedJob();this.state.verifiedEquipment.set(null);if(job)void this.router.navigate(['/jobs',job.id,'qr-scanner']);}
}
