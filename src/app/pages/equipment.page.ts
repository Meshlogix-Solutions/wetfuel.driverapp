import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard, IonCardContent, IonIcon, IonItem, IonCheckbox, IonLabel, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [RouterLink, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonItem, IonCheckbox, IonLabel, IonButton],
  template: `
<wf-mobile-shell title="Confirm equipment" subtitle="QR scan successful" backRoute="/qr-scanner">
  <main class="screen-body stack">
    <ion-card class="wf-card text-center">
      <ion-card-content>
        <div class="success-orb"><ion-icon name="checkmark-circle-outline"></ion-icon></div>
        <span class="pill success">Equipment matched</span>
        <h2 style="margin:14px 0 5px">Generator Tank GEN-04</h2>
        <p class="caption">QR: WF-EQ-00491</p>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card">
      <ion-card-content>
        <div class="photo-box filled" style="min-height:180px;font-size:16px">Generator tank reference photo</div>
        <hr class="divider">
        <div class="detail-row"><span>Customer</span><strong>Riverside Construction</strong></div>
        <div class="detail-row"><span>Fuel type</span><strong>ULSD Diesel</strong></div>
        <div class="detail-row"><span>Tank capacity</span><strong>500 gallons</strong></div>
        <div class="detail-row"><span>Last delivery</span><strong>Jun 26 · 238 gal</strong></div>
      </ion-card-content>
    </ion-card>
    <ion-card class="wf-card warning-card">
      <ion-card-content>
        <strong>Driver check</strong>
        <p class="caption">Confirm the QR label and equipment photo match the physical tank before connecting the hose.</p>
        <ion-item lines="none">
          <ion-checkbox slot="start"></ion-checkbox>
          <ion-label class="ion-text-wrap"><strong>Equipment identity confirmed</strong><p class="caption">Tank condition appears safe for fueling.</p></ion-label>
        </ion-item>
      </ion-card-content>
    </ion-card>
    <ion-button class="wf-button" expand="block" routerLink="/meter">Continue to meter connection</ion-button>
    <ion-button class="wf-button" color="danger" fill="outline" expand="block">Equipment does not match</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class EquipmentPage {

}
