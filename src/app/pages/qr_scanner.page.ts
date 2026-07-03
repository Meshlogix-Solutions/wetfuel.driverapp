import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonItem, IonInput, IonButton } from '@ionic/angular/standalone';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [FormsModule, RouterLink, MobileShellComponent, IonItem, IonInput, IonButton],
  template: `
<wf-mobile-shell title="Scan equipment" subtitle="Job WF-2048" backRoute="/arrival">
  <main class="screen-body stack">
    <section class="camera-mock">
      <div class="scan-frame"></div>
      <div style="position:absolute;bottom:24px;left:24px;right:24px;text-align:center"><strong>Align the equipment QR code inside the frame</strong><p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:13px">The scan works offline.</p></div>
    </section>
    <ion-button class="wf-button" color="tertiary" expand="block" routerLink="/equipment">Simulate successful scan</ion-button>
    <ion-item><ion-input label="Enter QR code manually" labelPlacement="stacked" [(ngModel)]="manualCode" placeholder="Example: WF-EQ-00491"></ion-input></ion-item>
    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/equipment">Find equipment</ion-button>
  </main>
</wf-mobile-shell>
  `
})
export class QrScannerPage {
  manualCode = '';
}
