import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonInput, IonItem } from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [FormsModule, MobileShellComponent, IonItem, IonInput, IonButton],
  template: `
    <wf-mobile-shell
      title="Scan equipment"
      [subtitle]="'Job ' + (state.selectedJob()?.jobNumber || '')"
      [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/arrival'">
      <main class="screen-body stack">
        <section class="camera-mock">
          <div class="scan-frame"></div>
          <div style="position:absolute;bottom:24px;left:24px;right:24px;text-align:center">
            <strong>Align the equipment QR code inside the frame</strong>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:13px">Scan the WF-EQ equipment label—not the JOB reference.</p>
          </div>
        </section>
        <ion-button class="wf-button" color="tertiary" expand="block" [disabled]="loading || !state.selectedJob()?.equipmentQrCode" (click)="lookup(state.selectedJob()?.equipmentQrCode || '')">Test Assigned Equipment QR</ion-button>
        @if (state.selectedJob()?.equipmentQrCode) {
          <p class="caption" style="margin:0;text-align:center">Assigned equipment: <strong>{{ state.selectedJob()!.equipmentQrCode }}</strong></p>
        }
        <ion-item><ion-input label="Enter equipment QR manually" labelPlacement="stacked" [(ngModel)]="manualCode" [placeholder]="state.selectedJob()?.equipmentQrCode || 'WF-EQ-...'"></ion-input></ion-item>
        <ion-button class="wf-button wf-secondary" expand="block" [disabled]="loading" (click)="lookup(manualCode)">Find equipment</ion-button>
        @if (error) { <p style="color:var(--ion-color-danger)">{{ error }}</p> }
      </main>
    </wf-mobile-shell>
  `,
  styles: [`.camera-mock{min-height:clamp(230px,36vh,320px)}`],
})
export class QrScannerPage {
  manualCode = '';
  loading = false;
  error = '';

  constructor(readonly state: DriverStateService, private readonly router: Router) {}

  async lookup(code: string): Promise<void> {
    const value = code.trim();
    if (!value) { this.error = 'Enter or scan an equipment QR code.'; return; }
    if (/^JOB-/i.test(value)) { this.error = 'Equipment not found. Scan a valid equipment QR code.'; return; }
    const job = this.state.selectedJob();
    if (!job) { this.error = 'Select a job before scanning equipment.'; return; }
    this.loading = true;
    this.error = '';
    try {
      await this.state.lookupEquipment(value);
      await this.router.navigate(['/jobs', job.id, 'equipment']);
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string } };
      this.error = failure.error?.message ?? 'Equipment not found. Scan a valid equipment QR code.';
    } finally {
      this.loading = false;
    }
  }
}
