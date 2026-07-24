import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonCheckbox, IonInput, IonItem, IonLabel, IonTextarea } from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

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
            <label class="photo-box" [class.filled]="!!meterPhotoUrl">
              📷<br>Meter photo<br><strong>{{ meterPhotoUrl ? 'Uploaded' : uploading === 'meter' ? 'Uploading...' : 'Tap to capture' }}</strong>
              <input hidden type="file" accept="image/*" capture="environment" (change)="uploadPhoto('meter',$event)">
            </label>
            <label class="photo-box" [class.filled]="!!equipmentPhotoUrl">
              📷<br>Equipment photo<br><strong>{{ equipmentPhotoUrl ? 'Uploaded' : uploading === 'equipment' ? 'Uploading...' : 'Tap to capture' }}</strong>
              <input hidden type="file" accept="image/*" capture="environment" (change)="uploadPhoto('equipment',$event)">
            </label>
          </div>
          @if (uploadError) { <p style="color:var(--ion-color-danger)">{{ uploadError }}</p> }
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
  uploadError = '';

  constructor(
    readonly state: DriverStateService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
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
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploading = kind;
    this.uploadError = '';
    try {
      const url = await this.state.uploadEvidence(file);
      if (kind === 'meter') this.meterPhotoUrl = url;
      else this.equipmentPhotoUrl = url;
      this.saveDraft();
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string }; message?: string };
      this.uploadError = failure.error?.message ?? failure.message ?? 'The photo could not be uploaded.';
    } finally {
      this.uploading = '';
      // The upload can settle while the tab is backgrounded (e.g. returning from the native
      // camera), outside a zone-tracked event — force the view to pick up the state change
      // immediately instead of waiting for the next unrelated click to trigger it.
      this.cdr.detectChanges();
    }
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
