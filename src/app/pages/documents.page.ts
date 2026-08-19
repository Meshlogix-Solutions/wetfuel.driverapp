import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController, IonButton, IonCard, IonCardContent, IonIcon, IonItem, IonLabel, IonList, IonSelect, IonSelectOption,
} from '@ionic/angular/standalone';
import { LoaderComponent } from '../shared/loader.component';
import { MobileShellComponent } from '../shared/mobile-shell.component';
import {
  DriverApiService,
  DriverComplianceDocument,
} from '../services/driver-api.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    DatePipe, FormsModule, MobileShellComponent, LoaderComponent,
    IonCard, IonCardContent, IonIcon, IonList, IonItem, IonLabel, IonButton,
    IonSelect, IonSelectOption,
  ],
  template: `
<wf-mobile-shell title="My documents" subtitle="Capture or upload compliance docs" backRoute="/profile">
  <main class="screen-body stack">
    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <h2 class="section-title">Add document</h2>
        <p class="caption" style="margin:0">
          Take a clear photo of your license, certification, or other compliance document.
          We extract expiry and details automatically. Blurry photos are rejected — try again.
        </p>

        <label class="field-label">Document type</label>
        <ion-select
          interface="popover"
          [ngModel]="documentType()"
          (ngModelChange)="onDocumentTypeChange($event)"
          [disabled]="busy() || extracting()">
          @for (t of docTypes; track t.value) {
            <ion-select-option [value]="t.value">{{ t.label }}</ion-select-option>
          }
        </ion-select>

        @if (previewUrl()) {
          <div class="preview-wrap">
            <img [src]="previewUrl()!" alt="Document preview" class="preview-img">
            <button type="button" class="clear-btn" [disabled]="busy()" (click)="clearPreview()">Clear</button>
          </div>
        }

        <div class="action-row">
          <label class="capture-btn" [class.disabled]="busy() || extracting()">
            <ion-icon name="camera-outline"></ion-icon>
            <span>{{ busy() || extracting() ? 'Working…' : 'Open camera' }}</span>
            <input hidden type="file" accept="image/*" capture="environment" [disabled]="busy() || extracting()" (change)="onFilePicked($event, true)">
          </label>
          <label class="capture-btn secondary" [class.disabled]="busy() || extracting()">
            <ion-icon name="clipboard-outline"></ion-icon>
            <span>Upload file</span>
            <input hidden type="file" accept="image/*" [disabled]="busy() || extracting()" (change)="onFilePicked($event, false)">
          </label>
        </div>

        @if (extracting()) {
          <wf-loader mode="inline" message="Reading document…" />
        }
      </ion-card-content>
    </ion-card>

    @if (showUploadModal()) {
      <ion-card class="wf-card">
        <ion-card-content class="stack">
          <h2 class="section-title" style="margin-top:0">Upload Compliance Document</h2>
          <p class="caption" style="margin:0 0 1rem;color:var(--wf-muted);">
            Review details, then save.
          </p>

          <div class="wf-form-grid">
            <div class="field" style="grid-column:1/-1">
              <label>Document type *</label>
              <select
                [ngModel]="documentType()"
                (ngModelChange)="onDocumentTypeChange($event)"
                [disabled]="busy() || extracting()">
                @for (t of docTypes; track t.value) {
                  <option [value]="t.value">{{ t.label }}</option>
                }
              </select>
            </div>

            <div class="field" style="grid-column:1/-1">
              <label>Document Name</label>
              <input
                type="text"
                [value]="uploadForm.documentName"
                [disabled]="busy()"
                (input)="uploadForm.documentName=$any($event.target).value" />
            </div>

            <div class="field">
              <label>Issued Date</label>
              <input
                type="date"
                [value]="uploadForm.issuedDate"
                [disabled]="busy()"
                (input)="uploadForm.issuedDate=$any($event.target).value" />
            </div>

            <div class="field">
              <label>Expiry Date</label>
              <input
                type="date"
                [value]="uploadForm.expiryDate"
                [disabled]="busy()"
                (input)="uploadForm.expiryDate=$any($event.target).value" />
            </div>

            <div class="field" style="grid-column:1/-1">
              <label>Notes</label>
              <textarea
                rows="2"
                [value]="uploadForm.notes"
                [disabled]="busy()"
                (input)="uploadForm.notes=$any($event.target).value"></textarea>
            </div>
          </div>

          <div class="wf-actions">
            <ion-button class="wf-button wf-secondary" expand="block" [disabled]="busy()" (click)="cancelUpload()">Cancel</ion-button>
            <ion-button class="wf-button" expand="block" [disabled]="busy() || !selectedFile()" (click)="saveUpload()">
              @if (busy()) { <wf-loader mode="button" /> }
              {{ busy() ? 'Uploading...' : 'Save' }}
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    }

    <ion-card class="wf-card">
      <ion-card-content class="stack">
        <h2 class="section-title">Uploaded documents</h2>
        @if (loading()) {
          <wf-loader mode="section" message="Loading documents..." />
        } @else if (documents().length === 0) {
          <p class="caption">No documents uploaded yet.</p>
        } @else {
          <ion-list lines="none">
            @for (doc of documents(); track doc.id) {
              <ion-item class="doc-item">
                <div class="icon-tile" slot="start"><ion-icon name="card-outline"></ion-icon></div>
                <ion-label class="ion-text-wrap">
                  <h3>{{ doc.documentName }}</h3>
                  <p class="caption">{{ doc.documentType }} · Expires {{ doc.expiryDate | date }}</p>
                  @if (doc.status) {
                    <span class="pill" [class.success]="doc.status === 'valid'" [class.warning]="doc.status === 'expiring_soon'" [class.danger]="doc.status === 'expired'">{{ doc.status }}</span>
                  }
                </ion-label>
                @if (doc.fileUrl) {
                  <a class="view-link" [href]="doc.fileUrl" target="_blank" rel="noopener">View</a>
                }
              </ion-item>
            }
          </ion-list>
        }
      </ion-card-content>
    </ion-card>
  </main>
</wf-mobile-shell>
  `,
  styles: [`
    .field-label { font-size: 12px; font-weight: 800; color: var(--wf-muted); }
    ion-select { width: 100%; min-height: 44px; padding: 8px 12px; border: 1px solid var(--wf-border); border-radius: 12px; background: var(--wf-surface); }
    .action-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .capture-btn {
      display: grid; place-items: center; gap: 6px; min-height: 88px; padding: 12px;
      border: 1px dashed var(--wf-border); border-radius: 16px; background: var(--wf-surface);
      font-weight: 800; font-size: 13px; color: var(--wf-text); cursor: pointer;
    }
    .capture-btn.secondary { border-style: solid; }
    .capture-btn.disabled { opacity: 0.55; pointer-events: none; }
    .capture-btn ion-icon { font-size: 22px; }
    .preview-wrap { position: relative; border-radius: 16px; overflow: hidden; border: 1px solid var(--wf-border); }
    .preview-img { display: block; width: 100%; max-height: 240px; object-fit: cover; }
    .clear-btn {
      position: absolute; top: 8px; right: 8px; border: 0; border-radius: 999px;
      padding: 6px 10px; font-weight: 800; background: rgba(0,0,0,.65); color: #fff;
    }
    .doc-item { --padding-start: 0; margin-bottom: 8px; }
    .view-link { font-size: 12px; font-weight: 800; color: var(--wf-primary, #0b6e4f); text-decoration: none; }
    .pill.danger { background: color-mix(in oklab, #c0392b 18%, white); color: #8e1b12; }
    .wf-extract-status {
      margin-top: 0.75rem;
      padding: 0.55rem 0.75rem;
      border: 1px solid var(--wf-border, oklch(85% 0.02 250));
      border-radius: 0.65rem;
      background: var(--wf-muted-bg, oklch(97% 0.01 250));
      font-weight: 800;
    }
    :host-context(html.dark) .wf-extract-status {
      background: oklch(22% 0.02 250);
      border-color: oklch(35% 0.02 250);
    }

    .wf-modal-backdrop { position:fixed;inset:0;background:oklch(0% 0 0 / 0.45);display:flex;align-items:center;justify-content:center;z-index:50;padding:1rem; }
    :host-context(html.dark) .wf-modal-backdrop { background: rgb(140 135 135 / 40%); }
    .wf-panel { max-width:36rem;width:100%; }
    .wf-modal { border-radius:16px; border:1px solid var(--wf-border); background: var(--wf-surface); color: var(--wf-text); padding:1rem; }
    .wf-form-grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 0.75rem; }
    .wf-actions { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 1rem; }
  `],
})
export class DocumentsPage {
  private static readonly DocTypeStorageKey = 'wf.driver.complianceDocType';

  private readonly api = inject(DriverApiService);
  private readonly toast = inject(ToastService);
  private readonly alerts = inject(AlertController);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly docTypes = [
    { value: 'license', label: 'License / CDL' },
    { value: 'certification', label: 'Certification' },
    { value: 'registration', label: 'Registration' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'medical', label: 'Medical card' },
    { value: 'other', label: 'Other' },
  ];

  readonly documentType = signal(this.readStoredDocType());
  readonly documents = signal<DriverComplianceDocument[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly extracting = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly showUploadModal = signal(false);

  readonly uploadForm: {
    documentName: string;
    issuedDate: string;
    expiryDate: string;
    notes: string;
  } = {
    documentName: '',
    issuedDate: '',
    expiryDate: '',
    notes: '',
  };

  constructor() {
    this.reload();
  }

  onDocumentTypeChange(value: string): void {
    const next = this.docTypes.some((t) => t.value === value) ? value : 'license';
    this.documentType.set(next);
    try {
      localStorage.setItem(DocumentsPage.DocTypeStorageKey, next);
    } catch {
      /* ignore quota / private mode */
    }
  }

  private readStoredDocType(): string {
    try {
      const stored = localStorage.getItem(DocumentsPage.DocTypeStorageKey);
      if (stored && this.docTypes.some((t) => t.value === stored)) return stored;
    } catch {
      /* ignore */
    }
    return 'license';
  }

  reload(): void {
    this.loading.set(true);
    this.api.getMyComplianceDocuments().subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        void this.toast.error('Could not load documents.');
      },
    });
  }

  onFilePicked(event: Event, _fromCamera: boolean): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const prev = this.previewUrl();
    if (prev) URL.revokeObjectURL(prev);

    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
    this.cdr.detectChanges();

    void this.extractAndPopulate(file);
  }

  clearPreview(): void {
    const prev = this.previewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.previewUrl.set(null);
    this.selectedFile.set(null);
    this.showUploadModal.set(false);
    this.extracting.set(false);
    this.uploadForm.documentName = '';
    this.uploadForm.issuedDate = '';
    this.uploadForm.expiryDate = '';
    this.uploadForm.notes = '';
  }

  cancelUpload(): void {
    this.showUploadModal.set(false);
    this.clearPreview();
    this.uploadForm.documentName = '';
    this.uploadForm.issuedDate = '';
    this.uploadForm.expiryDate = '';
    this.uploadForm.notes = '';
    this.cdr.detectChanges();
  }

  private async extractAndPopulate(file: File): Promise<void> {
    const docTypeHint = this.documentType();
    this.extracting.set(true);
    this.cdr.detectChanges();

    this.api.extractDocument(file, docTypeHint).subscribe({
      next: (fields) => {
        this.extracting.set(false);

        // If AI detected a different doc type, switch dropdown to it.
        if (fields.documentType && this.docTypes.some((t) => t.value === fields.documentType)) {
          this.onDocumentTypeChange(fields.documentType);
        }

        this.uploadForm.documentName = fields.suggestedDocumentName ?? '';
        this.uploadForm.issuedDate = fields.issuedDate ?? '';
        this.uploadForm.expiryDate = fields.expiryDate ?? '';
        const noteBits = [fields.holderName, fields.documentNumber].filter((x) => !!x);
        this.uploadForm.notes = noteBits.join(' · ');

        this.showUploadModal.set(true);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.extracting.set(false);
        const msg =
          err?.error?.message ||
          err?.error?.Message ||
          'Could not read this document. Capture a clearer photo and try again.';
        void this.toast.error(msg);
        this.cdr.detectChanges();
      },
    });
  }

  async saveUpload(): Promise<void> {
    const file = this.selectedFile();
    const docType = this.documentType();
    if (!file) return;

    const existing = this.documents().find(
      (d) => d.documentType?.toLowerCase() === docType.toLowerCase(),
    );
    if (existing) {
      const label = this.docTypes.find((t) => t.value === docType)?.label ?? docType;
      const alert = await this.alerts.create({
        header: 'Replace previous document?',
        message: `A ${label} already exists. The previous one will be replaced.`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'Replace', role: 'confirm' },
        ],
      });
      await alert.present();
      const result = await alert.onDidDismiss();
      if (result.role !== 'confirm') return;
    }

    this.busy.set(true);
    this.api.uploadComplianceDocument(file, docType, {
      documentName: this.uploadForm.documentName,
      issuedDate: this.uploadForm.issuedDate || undefined,
      expiryDate: this.uploadForm.expiryDate || undefined,
      notes: this.uploadForm.notes || undefined,
    }).subscribe({
      next: (doc) => {
        this.busy.set(false);
        this.showUploadModal.set(false);
        this.clearPreview();
        const expiry = doc.expiryDate ? ` Expiry ${doc.expiryDate}.` : '';
        void this.toast.success(
          doc.replacedPrevious
            ? `Previous ${docType} replaced.${expiry}`
            : doc.extractedFromAi
              ? `Document saved.${expiry}`
              : 'Document saved.',
        );
        this.reload();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.busy.set(false);
        const msg =
          err?.error?.message ||
          err?.error?.Message ||
          'Could not read this document. Capture a clearer photo and try again.';
        void this.toast.error(msg);
        this.cdr.detectChanges();
      },
    });
  }
}
