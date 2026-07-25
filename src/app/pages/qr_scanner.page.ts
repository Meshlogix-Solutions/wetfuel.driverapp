import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonInput, IonItem } from '@ionic/angular/standalone';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Barcode, BarcodeFormat, BarcodeScanner, BarcodesScannedEvent } from '@capacitor-mlkit/barcode-scanning';
// Web has no native BarcodeDetector in every browser - this polyfill backs the plugin's web
// implementation so scanning still works via ng serve / a plain browser tab, not just native.
import 'barcode-detector/polyfill';
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
        <section class="camera-mock barcode-scanner-modal">
          @if (isWeb) {
            <video #previewVideo autoplay muted playsinline class="scanner-video"></video>
          }
          <div class="scan-frame"></div>
          @if (scanning) {
            <div class="scan-hint">
              <strong>Align the equipment QR code inside the frame</strong>
              <p style="margin:6px 0 0;color:rgba(255,255,255,.7);font-size:13px">Scan the WF-EQ equipment label—not the JOB reference.</p>
            </div>
          } @else if (!supported) {
            <p class="scan-hint" style="text-align:center;color:rgba(255,255,255,.85)">Camera scanning isn't available on this device. Use manual entry below.</p>
          } @else if (permissionDenied) {
            <div class="scan-hint" style="text-align:center">
              <p style="margin:0 0 10px;color:rgba(255,255,255,.85)">Camera access was denied. {{ isWeb ? 'Allow camera access for this site in your browser settings.' : 'Enable it in app settings to scan.' }} You can still use manual entry below.</p>
              @if (!isWeb) { <ion-button size="small" fill="outline" color="light" (click)="openSettings()">Open settings</ion-button> }
            </div>
          } @else {
            <ion-button class="wf-button" color="tertiary" (click)="startScanning()">Turn on camera</ion-button>
          }
        </section>
        @if (scanning) {
          <ion-button class="wf-button wf-secondary" expand="block" (click)="stopScanning()">Cancel scan</ion-button>
        }
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
  styles: [`
    .camera-mock { min-height: clamp(230px,36vh,320px); position: relative; }
    .scanner-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 24px; }
    .scan-hint { position: absolute; bottom: 24px; left: 24px; right: 24px; z-index: 2; }
  `],
})
export class QrScannerPage implements OnDestroy {
  @ViewChild('previewVideo') previewVideo?: ElementRef<HTMLVideoElement>;

  readonly isWeb = Capacitor.getPlatform() === 'web';

  manualCode = '';
  loading = false;
  error = '';
  scanning = false;
  supported = true;
  permissionDenied = false;

  private listenerHandle?: PluginListenerHandle;

  constructor(readonly state: DriverStateService, private readonly router: Router) {}

  async ionViewWillEnter(): Promise<void> {
    await this.startScanning();
  }

  ionViewWillLeave(): void {
    void this.stopScanning();
  }

  ngOnDestroy(): void {
    void this.stopScanning();
  }

  async startScanning(): Promise<void> {
    if (this.scanning) return;
    this.error = '';
    this.permissionDenied = false;
    try {
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) { this.supported = false; return; }

      const { camera } = await BarcodeScanner.requestPermissions();
      if (camera !== 'granted' && camera !== 'limited') {
        this.permissionDenied = true;
        return;
      }

      this.listenerHandle = await BarcodeScanner.addListener('barcodesScanned', (event: BarcodesScannedEvent) => {
        const barcode = event.barcodes[0];
        if (barcode) void this.handleScan(barcode);
      });

      document.body.classList.add('barcode-scanner-active');
      await BarcodeScanner.startScan({
        formats: [BarcodeFormat.QrCode],
        videoElement: this.isWeb ? this.previewVideo?.nativeElement : undefined,
      });
      this.scanning = true;
    } catch {
      // Camera unavailable, blocked, or the plugin isn't backed on this platform - manual
      // entry (already rendered below) remains the fallback.
      this.supported = false;
      document.body.classList.remove('barcode-scanner-active');
    }
  }

  async stopScanning(): Promise<void> {
    document.body.classList.remove('barcode-scanner-active');
    if (this.listenerHandle) {
      await this.listenerHandle.remove();
      this.listenerHandle = undefined;
    }
    if (this.scanning) {
      try { await BarcodeScanner.stopScan(); } catch { /* already stopped */ }
    }
    this.scanning = false;
  }

  async openSettings(): Promise<void> {
    await BarcodeScanner.openSettings();
  }

  private async handleScan(barcode: Barcode): Promise<void> {
    const value = barcode.rawValue ?? barcode.displayValue ?? '';
    if (!value) return;
    await this.stopScanning();
    await this.lookup(value);
  }

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
      // A scanned code that didn't match should let the driver try again immediately
      // instead of landing back on a dead "camera off" state.
      if (this.supported && !this.permissionDenied) void this.startScanning();
    } finally {
      this.loading = false;
    }
  }
}
