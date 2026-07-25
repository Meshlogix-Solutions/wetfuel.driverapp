import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonButton, IonCard, IonCardContent, IonCheckbox, IonIcon, IonItem, IonLabel,
  IonSegment, IonSegmentButton, IonTextarea,
} from '@ionic/angular/standalone';
import { DriverStateService } from '../services/driver-state.service';
import { ToastService } from '../services/toast.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

type EvidenceKind = 'overview' | 'closeup' | 'document';

@Component({
  selector: 'app-incident',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MobileShellComponent,
    IonCard, IonCardContent, IonIcon, IonSegment, IonSegmentButton, IonLabel,
    IonItem, IonTextarea, IonCheckbox, IonButton,
  ],
  template: `
<wf-mobile-shell title="Report incident" subtitle="Safety first" backRoute="/dashboard">
  <main class="screen-body stack">
    <ion-card class="wf-card danger-card"><ion-card-content class="row"><div class="icon-tile"><ion-icon name="warning-outline"></ion-icon></div><div><strong>For immediate danger, call emergency services first.</strong><p class="caption" style="margin:4px 0 0">Once it is safe, record the incident below.</p></div></ion-card-content></ion-card>
    <section>
      <h2 class="section-title">Incident type</h2>
      <ion-segment [(ngModel)]="incidentType" scrollable>
        <ion-segment-button *ngFor="let type of types" [value]="type"><ion-label>{{ type }}</ion-label></ion-segment-button>
      </ion-segment>
    </section>
    <div class="severity-field">
      <label for="incident-severity">Severity</label>
      <select id="incident-severity" [(ngModel)]="severity">
        <option *ngFor="let option of severities" [value]="option.value">{{ option.label }}</option>
      </select>
    </div>
    <ion-item><ion-textarea label="What happened?" labelPlacement="stacked" [(ngModel)]="description" placeholder="Describe the incident, actions taken and current site condition..."></ion-textarea></ion-item>
    <section>
      <h2 class="section-title">Photos and evidence</h2>
      <p class="caption evidence-help">Add clear images, then review each preview before submitting.</p>
      <div class="evidence-grid">
        <ng-container *ngFor="let slot of evidenceSlots">
          <div class="evidence-card">
            <ng-container *ngIf="evidence[slot.kind]; else emptyEvidence">
              <img class="evidence-preview" [src]="evidence[slot.kind]" [alt]="slot.label + ' evidence preview'">
              <div class="evidence-caption"><strong>{{ slot.label }}</strong><span>Confirm the image is clear and readable.</span></div>
              <div class="evidence-actions">
                <label class="replace-action">Replace<input hidden type="file" accept="image/*" capture="environment" [disabled]="!!uploading" (change)="uploadEvidence(slot.kind,$event)"></label>
                <button type="button" class="remove-action" [disabled]="!!uploading" (click)="removeEvidence(slot.kind)">Remove</button>
              </div>
            </ng-container>
            <ng-template #emptyEvidence>
              <label class="evidence-empty">
                <span class="add-mark">＋</span><span>{{ slot.label }}</span><strong>{{ uploading === slot.kind ? 'Uploading...' : 'Add evidence' }}</strong>
                <input hidden type="file" accept="image/*" capture="environment" [disabled]="!!uploading" (change)="uploadEvidence(slot.kind,$event)">
              </label>
            </ng-template>
          </div>
        </ng-container>
      </div>
    </section>
    <ion-card class="wf-card"><ion-card-content>
      <ion-item lines="none"><ion-checkbox slot="start" [(ngModel)]="supervisorContacted"></ion-checkbox><ion-label class="ion-text-wrap"><strong>Supervisor has been contacted</strong><p class="caption">Franchise admin will receive an urgent alert.</p></ion-label></ion-item>
    </ion-card-content></ion-card>
    @if(state.syncError()){<ion-card class="wf-card danger-card"><ion-card-content><strong>Incident could not be submitted</strong><p class="caption" style="margin:6px 0 0">{{state.syncError()}}</p></ion-card-content></ion-card>}
    <ion-button class="wf-button" color="tertiary" expand="block" [disabled]="state.busy() || !!uploading" (click)="submit()">Submit incident report</ion-button>
    <ion-button class="wf-button wf-secondary" expand="block" routerLink="/dashboard">Cancel and return</ion-button>
  </main>
</wf-mobile-shell>
  `,
  styles: [`
    .severity-field { display: grid; gap: 7px; padding: 12px 14px; border: 1px solid var(--wf-border); border-radius: 14px; background: var(--wf-surface); }
    .severity-field label { color: var(--wf-muted); font-size: 12px; font-weight: 800; }
    .severity-field select { width: 100%; min-height: 44px; border: 0; outline: 0; background: var(--wf-surface); color: var(--wf-text); font: inherit; font-weight: 700; appearance: auto; }
    .severity-field select option { background: var(--wf-surface); color: var(--wf-text); }
    .evidence-help { margin: -4px 0 10px; }
    .evidence-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-items: start; }
    .evidence-card { min-width: 0; border: 1px solid var(--wf-border); border-radius: 16px; background: var(--wf-surface); overflow: hidden; }
    .evidence-empty { min-height: 170px; padding: 12px; display: grid; place-items: center; align-content: center; gap: 7px; text-align: center; color: var(--wf-muted); cursor: pointer; }
    .add-mark { font-size: 28px; color: var(--wf-primary); }
    .evidence-preview { display: block; width: 100%; height: 150px; object-fit: cover; background: var(--wf-accent-surface); }
    .evidence-caption { min-height: 68px; display: grid; align-content: start; gap: 3px; padding: 10px 11px 4px; }
    .evidence-caption span { color: var(--wf-muted); font-size: 11px; line-height: 1.35; }
    .evidence-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; padding: 8px 10px 10px; }
    .replace-action, .remove-action { min-height: 36px; border-radius: 9px; display: grid; place-items: center; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer; }
    .replace-action { color: var(--wf-primary); background: var(--wf-primary-soft); border: 1px solid transparent; }
    .remove-action { color: var(--ion-color-danger); background: transparent; border: 1px solid var(--wf-border); }
    .replace-action:has(input:disabled), .remove-action:disabled { opacity: .5; cursor: default; }
    @media(max-width: 560px) { .evidence-grid { grid-template-columns: 1fr; } .evidence-preview { height: 220px; } .evidence-caption { min-height: auto; } }
  `],
})
export class IncidentPage {
  readonly types = ['Spill', 'Equipment', 'Vehicle', 'Injury', 'Site hazard', 'Other'];
  readonly severities = [
    { value: 'low', label: 'Minor — contained, no injury' },
    { value: 'medium', label: 'Moderate — manager attention required' },
    { value: 'critical', label: 'Critical — emergency response involved' },
  ];
  readonly evidenceSlots: Array<{ kind: EvidenceKind; label: string }> = [
    { kind: 'overview', label: 'Overview' },
    { kind: 'closeup', label: 'Close-up' },
    { kind: 'document', label: 'Document' },
  ];
  readonly evidence: Record<EvidenceKind, string> = { overview: '', closeup: '', document: '' };
  incidentType = 'Spill';
  severity = 'low';
  description = '';
  supervisorContacted = false;
  uploading: EvidenceKind | '' = '';

  constructor(
    readonly state: DriverStateService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  async uploadEvidence(kind: EvidenceKind, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading = kind;
    try {
      const previous = this.evidence[kind];
      this.evidence[kind] = await this.state.uploadEvidence(file);
      if (previous) void this.state.deleteEvidence(previous);
    } catch (error: unknown) {
      const failure = error as { error?: { message?: string }; message?: string };
      void this.toast.error(failure.error?.message ?? failure.message ?? 'The evidence image could not be uploaded.');
    } finally {
      this.uploading = '';
      input.value = '';
      this.cdr.detectChanges();
    }
  }

  removeEvidence(kind: EvidenceKind): void { const previous=this.evidence[kind]; this.evidence[kind]=''; if(previous)void this.state.deleteEvidence(previous); }

  async submit(): Promise<void> {
    const jobId = this.route.snapshot.queryParamMap.get('jobId') ?? undefined;
    if (!this.description.trim()) {
      void this.toast.error('Describe what happened before submitting the report.');
      return;
    }
    const ok = await this.state.reportIncident({
      jobId,
      incidentType: this.incidentType,
      severity: this.severity,
      description: this.description,
      supervisorContacted: this.supervisorContacted,
      evidenceUrls: Object.values(this.evidence).filter(Boolean),
    });
    if (!ok) return;
    void this.router.navigateByUrl('/dashboard');
  }
}
