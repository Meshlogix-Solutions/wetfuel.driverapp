import { ChangeDetectorRef, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonInput, IonItem } from '@ionic/angular/standalone';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Barcode, BarcodeFormat, BarcodeScanner, BarcodesScannedEvent } from '@capacitor-mlkit/barcode-scanning';
// Web has no native BarcodeDetector in every browser - this polyfill backs the plugin's web
// implementation so scanning still works via ng serve / a plain browser tab, not just native.
import 'barcode-detector/polyfill';
import { DriverStateService } from '../services/driver-state.service';
import { LoaderComponent } from '../shared/loader.component';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [FormsModule, MobileShellComponent, LoaderComponent, IonItem, IonInput, IonButton],
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
               </div>
          } @else if (!supported) {
            <p class="scan-hint" style="text-align:center;color:rgba(255,255,255,.85)">Camera scanning isn't available on this device. Use manual entry below.</p>
          } @else if (permissionDenied) {
            <div class="scan-hint" style="text-align:center">
              <p style="margin:0 0 10px;color:rgba(255,255,255,.85)">Camera access was denied. {{ isWeb ? 'Allow camera access for this site in your browser settings.' : 'Enable it in app settings to scan.' }} You can still use manual entry below.</p>
              @if (!isWeb) { <ion-button size="small" fill="outline" color="light" (click)="openSettings()">Open settings</ion-button> }
            </div>
          } @else {
            <ion-button class="wf-button" color="tertiary" (click)="startScanning()">Scan Equipment</ion-button>
          }
        </section>
        @if (scanning) {
          <ion-button class="wf-button wf-secondary" expand="block" (click)="stopScanning()">Cancel scan</ion-button>
        }
        <ion-item><ion-input label="Enter equipment QR manually" labelPlacement="stacked" [(ngModel)]="manualCode" placeholder="WF-EQ-..."></ion-input></ion-item>
        <ion-button class="wf-button wf-secondary" expand="block" [disabled]="loading" (click)="lookup(manualCode)">
          @if (loading) { <wf-loader mode="button" /> }
          {{ loading ? 'Finding equipment...' : 'Find equipment' }}
        </ion-button>
      </main>
    </wf-mobile-shell>
  `,
  styles: [`
    // .scan-hint used to be pinned to the container's bottom edge (position:absolute; bottom:24px)
    // independent of where the centered .scan-frame actually sits, so at the container's normal
    // height the two just overlapped. Stacking them as grid rows (frame, then hint below it) with
    // a gap keeps them apart regardless of container height, instead of fragile offset math.
    .camera-mock {
      min-height: clamp(280px,40vh,360px);
      position: relative;
      display: grid;
      align-content: center;
      justify-items: center;
      gap: 16px;
      padding: 24px 16px;
    }
    .scanner-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 24px; }
    .scan-hint { position: relative; z-index: 2; text-align: center; max-width: 280px; }
  `],
})
export class QrScannerPage implements OnDestroy {
  @ViewChild('previewVideo') previewVideo?: ElementRef<HTMLVideoElement>;

  readonly isWeb = Capacitor.getPlatform() === 'web';

  manualCode = '';
  loading = false;
  scanning = false;
  supported = true;
  permissionDenied = false;

  private listenerHandle?: PluginListenerHandle;
  private lastScannedValue = '';
  private lastScannedAt = 0;

  constructor(
    readonly state: DriverStateService,
    private readonly router: Router,
    private readonly zone: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly toast: ToastService,
  ) {}

  ionViewWillLeave(): void {
    void this.stopScanning();
  }

  ngOnDestroy(): void {
    void this.stopScanning();
  }

  async startScanning(): Promise<void> {
    if (this.scanning) return;
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
        // Fired by native code re-entering the JS engine, not through any zone-patched API,
        // so it runs outside Angular's zone - component state changes made from in here
        // (e.g. this.error in lookup()) would otherwise never trigger a re-render.
        this.zone.run(() => {
          const barcode = event.barcodes[0];
          if (barcode) void this.handleScan(barcode);
        });
      });

      document.documentElement.classList.add('barcode-scanner-active');
      document.body.classList.add('barcode-scanner-active');
      await BarcodeScanner.startScan({
        formats: [BarcodeFormat.QrCode],
        videoElement: this.isWeb ? this.previewVideo?.nativeElement : undefined,
      });
      this.scanning = true;
    } catch (err: unknown) {
      // Camera unavailable, blocked, or the plugin isn't backed on this platform - manual
      // entry (already rendered below) remains the fallback. Logged (not swallowed) since
      // "not supported" is otherwise indistinguishable from a real plugin/permission failure.
      console.error('QR scanner failed to start', err);
      this.supported = false;
      document.documentElement.classList.remove('barcode-scanner-active');
      document.body.classList.remove('barcode-scanner-active');
    } finally {
      // BarcodeScanner's plugin-bridge promises (isSupported/requestPermissions/startScan) can
      // resolve via the native bridge outside Angular's zone, same as the listener callback -
      // without this, "Scan Equipment" can linger on screen even after scanning has genuinely
      // started, since Angular never re-renders to hide it.
      this.cdr.detectChanges();
    }
  }

  async stopScanning(): Promise<void> {
    document.documentElement.classList.remove('barcode-scanner-active');
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
    // Without this, a non-matching code that stays in frame re-triggers handleScan on every
    // detection pass - each one stops and restarts the camera, which reads as the preview
    // rapidly blinking on/off while the driver repositions or hunts for the right label.
    const now = Date.now();
    if (value === this.lastScannedValue && now - this.lastScannedAt < 2000) return;
    this.lastScannedValue = value;
    this.lastScannedAt = now;
    await this.stopScanning();
    await this.lookup(value);
    // Belt-and-braces: zone.run() around the listener callback should already make this
    // unnecessary, but force a render here too so the scanning/loading state (the "Scan
    // Equipment" button re-appearing, etc.) is guaranteed to actually reach the screen
    // instead of silently updating dead state.
    this.cdr.detectChanges();
  }

  async lookup(code: string): Promise<void> {
    const value = code.trim();
    if (!value) { void this.toast.error('Enter or scan an equipment QR code.'); return; }
    if (/^JOB-/i.test(value)) { void this.toast.error('Equipment not found. Scan a valid equipment QR code.'); return; }
    const job = this.state.selectedJob();
    if (!job) { void this.toast.error('Select a job before scanning equipment.'); return; }
    this.loading = true;
    try {
      await this.state.lookupEquipment(value);
      await this.router.navigate(['/jobs', job.id, 'equipment']);
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string } };
      void this.toast.error(failure.error?.message ?? 'Equipment not found. Scan a valid equipment QR code.');
      // Stay on this page with the camera off - the driver taps "Scan Equipment" (rendered
      // below whenever !scanning) to try again deliberately, instead of the camera silently
      // relaunching into the same mismatch.
    } finally {
      this.loading = false;
    }
  }
}
