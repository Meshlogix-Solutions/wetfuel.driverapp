import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCheckbox, IonInput, IonItem, IonLabel, IonTextarea } from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-delivery-proof',
  standalone: true,
  imports: [FormsModule, MobileShellComponent, IonCard, IonCardContent, IonItem, IonInput, IonTextarea, IonCheckbox, IonLabel, IonButton],
  template: `
    <wf-mobile-shell title="Delivery proof" [subtitle]="state.deliveredGallons() + ' gallons captured'" [backRoute]="'/jobs/' + (state.selectedJob()?.id || '') + '/fueling'">
      <main class="screen-body stack">
        <ion-card class="wf-card soft-card"><ion-card-content><strong>Meter delivery saved</strong><p class="caption" style="margin:4px 0 0">Upload both required photos and enter totalizers when available.</p></ion-card-content></ion-card>
        <section>
          <h2 class="section-title">Required photos</h2>
          <div class="photo-grid">
            <div class="proof-photo-card">
              @if (meterPhotoUrl) {
                <img class="photo-preview" [src]="meterPhotoUrl" alt="Uploaded meter reading photo preview">
                <div class="photo-caption"><strong>Meter photo</strong><span>Check that the reading is clear.</span></div>
                <div class="photo-actions">
                  <label class="retake-action">Retake<input hidden type="file" accept="image/*" capture="environment" [disabled]="!!uploading" (change)="uploadPhoto('meter',$event)"></label>
                  <button type="button" class="remove-action" [disabled]="!!uploading" (click)="removePhoto('meter')">Remove</button>
                </div>
              } @else {
                <label class="photo-box">
                  <span class="camera-mark">📷</span><span>Meter photo</span><strong>{{ uploading === 'meter' ? 'Uploading...' : 'Tap to capture' }}</strong>
                  <input hidden type="file" accept="image/*" capture="environment" [disabled]="!!uploading" (change)="uploadPhoto('meter',$event)">
                </label>
              }
            </div>
            <div class="proof-photo-card">
              @if (equipmentPhotoUrl) {
                <img class="photo-preview" [src]="equipmentPhotoUrl" alt="Uploaded equipment photo preview">
                <div class="photo-caption"><strong>Equipment photo</strong><span>Check that the equipment is in focus.</span></div>
                <div class="photo-actions">
                  <label class="retake-action">Retake<input hidden type="file" accept="image/*" capture="environment" [disabled]="!!uploading" (change)="uploadPhoto('equipment',$event)"></label>
                  <button type="button" class="remove-action" [disabled]="!!uploading" (click)="removePhoto('equipment')">Remove</button>
                </div>
              } @else {
                <label class="photo-box">
                  <span class="camera-mark">📷</span><span>Equipment photo</span><strong>{{ uploading === 'equipment' ? 'Uploading...' : 'Tap to capture' }}</strong>
                  <input hidden type="file" accept="image/*" capture="environment" [disabled]="!!uploading" (change)="uploadPhoto('equipment',$event)">
                </label>
              }
            </div>
          </div>
          @if (meterPhotoUrl || equipmentPhotoUrl) { <p class="preview-help">Review each preview before continuing. Retake any photo that is blurry, dark, or unreadable.</p> }
        </section>
        <ion-card class="wf-card"><ion-card-content class="stack">
          <h2 class="section-title">Meter readings</h2>
          <div class="grid-2">
            <ion-item><ion-input label="Starting totalizer" labelPlacement="stacked" type="number" [(ngModel)]="startingTotalizer"></ion-input></ion-item>
            <ion-item><ion-input label="Ending totalizer" labelPlacement="stacked" type="number" [(ngModel)]="endingTotalizer"></ion-input></ion-item>
          </div>
          <ion-item><ion-input label="Delivered volume" labelPlacement="stacked" [value]="state.deliveredGallons() + ' gallons'" [readonly]="true"></ion-input></ion-item>
          @if (!validMeter) { <p style="color:var(--ion-color-danger)">Enter both totalizers and make sure their difference matches the delivered gallons.</p> }
        </ion-card-content></ion-card>
        <ion-card class="wf-card"><ion-card-content>
          <ion-item lines="full"><ion-checkbox slot="start" [(ngModel)]="safe"></ion-checkbox><ion-label class="ion-text-wrap"><strong>No leaks or spills observed</strong><p class="caption">Hose disconnected and caps secured.</p></ion-label></ion-item>
          <ion-item lines="none"><ion-checkbox slot="start" [(ngModel)]="notified"></ion-checkbox><ion-label class="ion-text-wrap"><strong>Customer/site contact notified</strong><p class="caption">Delivery completion communicated.</p></ion-label></ion-item>
        </ion-card-content></ion-card>
        <ion-item><ion-textarea label="Driver notes" labelPlacement="stacked" [(ngModel)]="notes" placeholder="Delivery completed without issue..."></ion-textarea></ion-item>
        <ion-button class="wf-button" expand="block" [disabled]="!canReview" (click)="review()">Review delivery summary</ion-button>
      </main>
    </wf-mobile-shell>
  `,
  styles: [`
    .photo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
    .proof-photo-card { min-width: 0; border: 1px solid var(--wf-border); border-radius: 16px; background: var(--wf-surface); overflow: hidden; }
    .proof-photo-card .photo-box { min-height: 190px; border: 0; border-radius: 0; cursor: pointer; align-content: center; gap: 7px; }
    .camera-mark { font-size: 24px; }
    .photo-preview { display: block; width: 100%; height: 180px; object-fit: cover; background: var(--wf-accent-surface); }
    .photo-caption { display: grid; gap: 3px; padding: 11px 12px 5px; }
    .photo-caption span, .preview-help { color: var(--wf-muted); font-size: 12px; }
    .photo-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 8px 12px 12px; }
    .retake-action, .remove-action { min-height: 38px; border-radius: 10px; display: grid; place-items: center; font: inherit; font-size: 13px; font-weight: 800; cursor: pointer; }
    .retake-action { color: var(--wf-primary); background: var(--wf-primary-soft); border: 1px solid transparent; }
    .remove-action { color: var(--ion-color-danger); background: transparent; border: 1px solid var(--wf-border); }
    .retake-action:has(input:disabled), .remove-action:disabled { opacity: .5; cursor: default; }
    .preview-help { margin: 10px 2px 0; line-height: 1.45; }
    @media(max-width: 390px) { .photo-grid { grid-template-columns: 1fr; } .photo-preview { height: 210px; } }
  `],
})
export class DeliveryProofPage implements OnInit {
  notes = 'Delivery completed safely.';
  startingTotalizer?: number;
  endingTotalizer?: number;
  meterPhotoUrl = '';
  equipmentPhotoUrl = '';
  safe = false;
  notified = false;
  uploading: '' | 'meter' | 'equipment' = '';

  constructor(
    readonly state: DriverStateService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly toast: ToastService,
  ) {}
  ngOnInit(): void {
    const draft = this.state.deliveryDraft();
    this.startingTotalizer = draft.startingTotalizer;
    this.endingTotalizer = draft.endingTotalizer;
    this.notes = draft.notes ?? this.notes;
    this.meterPhotoUrl = draft.meterPhotoUrl ?? '';
    this.equipmentPhotoUrl = draft.equipmentPhotoUrl ?? '';
  }
  get validMeter(): boolean {
    if (this.startingTotalizer == null && this.endingTotalizer == null) return true;
    if (this.startingTotalizer == null || this.endingTotalizer == null) return false;
    return this.endingTotalizer >= this.startingTotalizer
      && Math.abs((this.endingTotalizer - this.startingTotalizer) - this.state.deliveredGallons()) <= 0.1;
  }
  get canReview(): boolean {
    return !!this.meterPhotoUrl && !!this.equipmentPhotoUrl && this.safe && this.notified && this.validMeter && !this.uploading;
  }
  async uploadPhoto(kind: 'meter' | 'equipment', event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading = kind;
    try {
      const url = await this.state.uploadEvidence(file);
      const previous = kind === 'meter' ? this.meterPhotoUrl : this.equipmentPhotoUrl;
      if (kind === 'meter') this.meterPhotoUrl = url; else this.equipmentPhotoUrl = url;
      if (previous && previous !== url) void this.state.deleteEvidence(previous);
      this.saveDraft();
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string }; message?: string };
      void this.toast.error(failure.error?.message ?? failure.message ?? 'The photo could not be uploaded.');
    } finally {
      this.uploading = '';
      input.value = '';
      // The upload can settle while the tab is backgrounded (e.g. returning from the native
      // camera), outside a zone-tracked event — force the view to pick up the state change
      // immediately instead of waiting for the next unrelated click to trigger it.
      this.cdr.detectChanges();
    }
  }
  removePhoto(kind: 'meter' | 'equipment'): void {
    const previous = kind === 'meter' ? this.meterPhotoUrl : this.equipmentPhotoUrl;
    if (kind === 'meter') this.meterPhotoUrl = ''; else this.equipmentPhotoUrl = '';
    if (previous) void this.state.deleteEvidence(previous);
    this.saveDraft();
  }
  async review(): Promise<void> {
    const job = this.state.selectedJob();
    if (!job || !this.canReview) return;
    this.saveDraft();
    if (!(await this.state.updateJob(job.id, 'proof_submitted'))) return;
    void this.router.navigate(['/jobs', job.id, 'delivery-summary']);
  }

  private saveDraft(): void {
    this.state.setDeliveryProof({
      startingTotalizer: this.startingTotalizer, endingTotalizer: this.endingTotalizer, notes: this.notes,
      meterPhotoCaptured: !!this.meterPhotoUrl, equipmentPhotoCaptured: !!this.equipmentPhotoUrl,
      meterPhotoUrl: this.meterPhotoUrl, equipmentPhotoUrl: this.equipmentPhotoUrl,
    });
  }
}
