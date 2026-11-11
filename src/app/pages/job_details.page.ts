import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { DriverJob, DriverJobDelivery, DriverShift } from '../services/driver-api.service';
import { DriverCacheService } from '../services/driver-cache.service';
import { DriverStateService } from '../services/driver-state.service';
import { DriverWorkflowService } from '../services/driver-workflow.service';
import { OfflineStoreService } from '../services/offline-store.service';
import { LoaderComponent } from '../shared/loader.component';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector:'app-job-details',standalone:true,
  imports:[CommonModule,MobileShellComponent,LoaderComponent,IonCard,IonCardContent,IonButton,IonIcon],
  template:`
<wf-mobile-shell [title]="'Job '+(state.selectedJob()?.jobNumber??'')" [subtitle]="statusLabel" backRoute="/jobs" [showNav]="true">
  <main class="screen-body stack job-detail-body" [class.completed-detail]="state.selectedJob()?.status==='completed'">
    @if (requirementsLoading()) {
      <wf-loader mode="section" message="Loading job..." />
    } @else {
    <ion-card class="wf-card hero-card"><ion-card-content><span class="pill dark">{{state.selectedJob()?.status==='completed'?'Completed':'Scheduled'}} · {{state.selectedJob()?.scheduledAt|date:'short'}}</span><h1 style="margin:16px 0 5px;font-size:28px">{{state.selectedJob()?.customerName}}</h1><p class="caption" style="margin:0">{{state.selectedJob()?.siteAddress}}</p></ion-card-content></ion-card>
    @if(state.selectedJob()?.status==='completed'){<ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Delivered</span><strong>{{state.selectedJob()?.fueledGallons??record()?.deliveredGallons??0}}</strong><span class="caption">of {{state.selectedJob()?.targetGallons??0}} gal</span></ion-card-content></ion-card>
    <ion-card class="wf-card"><ion-card-content class="stack">
      <h2 class="section-title">Delivery record</h2>
      @if(record(); as delivery){
        <div class="detail-row"><span>Completed</span><strong>{{delivery.completedAt | date:'short'}}</strong></div>
        @if(delivery.vehicleName){<div class="detail-row"><span>Vehicle</span><strong>{{delivery.vehicleName}}</strong></div>}
        @if(delivery.startingTotalizer!=null){<div class="detail-row"><span>Starting totalizer</span><strong>{{delivery.startingTotalizer}}</strong></div>}
        @if(delivery.endingTotalizer!=null){<div class="detail-row"><span>Ending totalizer</span><strong>{{delivery.endingTotalizer}}</strong></div>}
        @if(delivery.notes){<div><strong>Driver notes</strong><p class="caption" style="margin:4px 0 0">{{delivery.notes}}</p></div>}
        @if(meterPhoto()||equipmentPhoto()){
          <div class="proof-grid">
            @if(meterPhoto()){<button type="button" class="proof-shot" (click)="openPreview(meterPhoto(),'Meter photo')"><img [src]="meterPhoto()" alt="Meter photo"><span>Meter photo</span></button>}
            @if(equipmentPhoto()){<button type="button" class="proof-shot" (click)="openPreview(equipmentPhoto(),'Equipment photo')"><img [src]="equipmentPhoto()" alt="Equipment photo"><span>Equipment photo</span></button>}
          </div>
        } @else {<p class="caption" style="margin:0">No proof photos were saved with this delivery.</p>}
      } @else {<p class="caption" style="margin:0">No delivery record was saved for this job.</p>}
    </ion-card-content></ion-card>}
    <section class="job-metrics"><ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Target</span><strong>{{state.selectedJob()?.targetGallons??0}}</strong><span class="caption">gallons</span></ion-card-content></ion-card><ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Fuel</span><strong>{{fuelLabel}}</strong><span class="caption">Fuel type</span></ion-card-content></ion-card><ion-card class="wf-card"><ion-card-content class="metric"><span class="label">Equipment</span><strong>{{state.selectedJob()?.equipmentCode??'—'}}</strong><span class="caption">{{state.selectedJob()?.equipmentType??'Equipment'}}</span></ion-card-content></ion-card></section>

    @if(!requirementsLoading()&&blockedByOtherActiveJob){
      <ion-card class="wf-card warning-card"><ion-card-content><strong>Job in progress</strong><p class="caption" style="margin:6px 0 0">You already have a job in progress. Please complete the current job before starting a new one.</p></ion-card-content></ion-card>
    }

    @if(!requirementsLoading()&&needsAction&&!blockedByOtherActiveJob){
      <ion-card class="wf-card warning-card"><ion-card-content class="stack"><div><strong>Action required</strong><p class="caption" style="margin:6px 0 0">{{!activeShift()?'Start your shift before beginning this job.':'Select an assigned vehicle before beginning this job.'}}</p></div>
      @if(!activeShift()){<ion-button class="wf-button" expand="block" [disabled]="state.busy()" (click)="startShift()">@if(state.busy()){<wf-loader mode="button" />}Start shift</ion-button>}
      @if(activeShift()&&!activeShift()?.vehicleId){<ion-button class="wf-button" expand="block" [disabled]="state.busy()" (click)="selectVehicle()">@if(state.busy()){<wf-loader mode="button" />}Select vehicle</ion-button>}
      </ion-card-content></ion-card>
    }

    <ion-card class="wf-card"><ion-card-content class="stack"><h2 class="section-title">Site contact</h2><div class="row"><div class="avatar">{{contactInitials}}</div><div class="grow"><strong>{{state.selectedJob()?.siteContactName||'Site contact not provided'}}</strong><p class="caption" style="margin:4px 0 0">{{state.selectedJob()?.siteContactPhone||state.selectedJob()?.customerPhone||'No phone number provided'}}</p></div>@if(state.selectedJob()?.siteContactPhone||state.selectedJob()?.customerPhone){<ion-button fill="outline" shape="round" [href]="'tel:'+(state.selectedJob()?.siteContactPhone||state.selectedJob()?.customerPhone)"><ion-icon slot="icon-only" name="call-outline"></ion-icon></ion-button>}</div></ion-card-content></ion-card>
    <ion-card class="wf-card"><ion-card-content class="stack"><h2 class="section-title">Delivery instructions</h2><div class="row"><div class="icon-tile"><ion-icon name="lock-closed-outline"></ion-icon></div><div><strong>Site instructions</strong><p class="caption" style="margin:4px 0 0">{{state.selectedJob()?.deliveryInstructions||'No special delivery instructions.'}}</p></div></div>@if(state.selectedJob()?.status!=='completed'){<div class="row"><div class="icon-tile"><ion-icon name="camera-outline"></ion-icon></div><div><strong>Delivery proof required</strong><p class="caption" style="margin:4px 0 0">Record the meter and equipment evidence before completion.</p></div></div>}</ion-card-content></ion-card>
    @if(state.selectedJob()?.safetyNote){<ion-card class="wf-card warning-card"><ion-card-content><strong>Safety note</strong><p class="caption" style="margin:6px 0 0">{{state.selectedJob()?.safetyNote}}</p></ion-card-content></ion-card>}
    }
  </main>
  @if(state.selectedJob()?.status!=='completed'){<div class="fixed-job-action"><ion-button class="wf-button" color="tertiary" expand="block" [disabled]="state.busy()||requirementsLoading()||(state.selectedJob()?.status==='assigned'&&(needsAction||blockedByOtherActiveJob))" (click)="continueJob()">@if(state.busy()){<wf-loader mode="button" />}{{actionLabel}}</ion-button></div>}
  @if(previewUrl()){<button type="button" class="proof-preview" (click)="closePreview()" [attr.aria-label]="'Close '+previewTitle()"><img [src]="previewUrl()" [alt]="previewTitle()"><span>{{previewTitle()}}</span></button>}
</wf-mobile-shell>`,
  styles:[`
    .job-detail-body{padding-bottom:200px}.job-detail-body.completed-detail{padding-bottom:120px}.fixed-job-action{position:fixed;z-index:30;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(calc(100% - 28px),692px);padding:10px;background:color-mix(in srgb,var(--wf-surface) 95%,transparent);border:1px solid var(--wf-border);border-radius:20px;box-shadow:0 14px 38px rgba(0,0,0,.2);backdrop-filter:blur(16px)}.fixed-job-action ion-button{margin:0}
    .proof-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.proof-shot{display:grid;gap:6px;padding:0;border:0;background:transparent;text-align:left;color:inherit;cursor:zoom-in}.proof-shot img{width:100%;height:140px;object-fit:cover;border-radius:14px;background:var(--wf-accent-surface)}.proof-shot span{font-size:12px;font-weight:800}.proof-preview{position:fixed;z-index:80;inset:0;display:grid;align-content:center;justify-items:center;gap:12px;padding:24px;border:0;background:rgba(0,0,0,.88);cursor:zoom-out}.proof-preview img{max-width:100%;max-height:calc(100vh - 120px);object-fit:contain}.proof-preview span{color:#fff;font-weight:800}
    .job-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.job-metrics ion-card:last-child{grid-column:1/-1}.job-metrics .metric{min-width:0}.job-metrics .metric strong{min-width:0;font-size:18px!important;line-height:1.15!important;overflow-wrap:anywhere;word-break:break-word}.job-metrics ion-card:first-child .metric strong{font-size:26px!important}.job-metrics ion-card:last-child .metric strong{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:16px!important}@media(min-width:520px){.job-metrics{grid-template-columns:repeat(3,minmax(0,1fr))}.job-metrics ion-card:last-child{grid-column:auto}}
  `],
})
export class JobDetailsPage {
  private static readonly IN_PROGRESS_STATUSES = new Set(['started', 'arrived', 'equipment_verified', 'fueled', 'proof_submitted']);
  readonly activeShift=signal<DriverShift|null>(null);
  readonly otherActiveJob=signal<DriverJob|null>(null);
  readonly requirementsLoading=signal(true);
  readonly record=signal<DriverJobDelivery|null>(null);
  readonly meterPhoto=signal('');
  readonly equipmentPhoto=signal('');
  readonly previewUrl=signal('');
  readonly previewTitle=signal('');
  constructor(readonly state:DriverStateService,private readonly router:Router,private readonly workflow:DriverWorkflowService,private readonly cache:DriverCacheService,private readonly store:OfflineStoreService){}
  ionViewWillEnter():void{void this.loadRequirements();}
  openPreview(url:string,title:string):void{this.previewUrl.set(url);this.previewTitle.set(title);}
  closePreview():void{this.previewUrl.set('');this.previewTitle.set('');}
  get needsAction():boolean{return !this.activeShift()||!this.activeShift()?.vehicleId;}
  get blockedByOtherActiveJob():boolean{return this.state.selectedJob()?.status==='assigned'&&!!this.otherActiveJob();}
  get statusLabel():string{return this.label(this.state.selectedJob()?.status||'assigned');}
  get fuelLabel():string{return this.label(this.state.selectedJob()?.fuelType||'Not specified');}
  get contactInitials():string{return (this.state.selectedJob()?.siteContactName||'SC').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();}
  get actionLabel():string{const status=this.state.selectedJob()?.status;return ({assigned:'Start job and navigate',started:'Continue navigation',arrived:'Scan assigned equipment',equipment_verified:'Connect delivery meter',fueled:'Continue to delivery proof',proof_submitted:'Review delivery summary',completed:'View delivery history'} as Record<string,string>)[status||'assigned']||'Continue job';}
  async startShift():Promise<void>{if(await this.workflow.startShift())await this.loadRequirements();}
  async selectVehicle():Promise<void>{const job=this.state.selectedJob();if(job)void this.router.navigate(['/jobs',job.id,'vehicle-confirmation']);}
  async continueJob():Promise<void>{const job=this.state.selectedJob();if(!job)return;const currentStatus=job.status;if(currentStatus==='assigned'){if(this.needsAction||this.blockedByOtherActiveJob)return;void this.router.navigate(['/jobs',job.id,'vehicle-confirmation']);return;}const route=({started:'route-map',arrived:'qr-scanner',equipment_verified:'meter',fueled:'delivery-proof',proof_submitted:'delivery-summary'} as Record<string,string>)[currentStatus];if(currentStatus==='completed'){void this.router.navigateByUrl('/history');return;}if(!route){void this.router.navigateByUrl('/jobs');return;}void this.router.navigate(['/jobs',job.id,route]);}
  private async loadRequirements():Promise<void>{
    const hasCache=!!this.cache.activeShift()||this.cache.jobs().length>0||this.cache.hydrated();
    if(!hasCache) this.requirementsLoading.set(true);
    const jobId=this.state.selectedJob()?.id;
    const shift=await this.workflow.getActiveShift();
    const jobs=this.cache.jobs();
    this.activeShift.set(shift);
    if(shift?.vehicleId)this.state.selectedVehicleId.set(shift.vehicleId);
    this.otherActiveJob.set(jobs.find(job=>job.id!==jobId&&JobDetailsPage.IN_PROGRESS_STATUSES.has(job.status))??null);
    await this.loadRecord();
    this.requirementsLoading.set(false);
  }
  private async loadRecord():Promise<void>{
    const job=this.state.selectedJob();
    this.meterPhoto.set('');
    this.equipmentPhoto.set('');
    this.closePreview();
    if(job?.status!=='completed'){this.record.set(null);return;}
    const delivery=job.delivery??await this.localDelivery(job.id);
    this.record.set(delivery);
    this.meterPhoto.set(await this.state.resolvePhotoUrl(delivery?.meterPhotoUrl));
    this.equipmentPhoto.set(await this.state.resolvePhotoUrl(delivery?.equipmentPhotoUrl));
  }
  private async localDelivery(jobId:string):Promise<DriverJobDelivery|null>{
    const events=await this.store.getUnsyncedEventsForJob(jobId);
    const completed=[...events].reverse().find(event=>event.eventType==='delivery.completed');
    if(!completed)return null;
    const payload=completed.payload;
    const proof=payload['proof'] as Record<string,unknown>|undefined;
    return {
      deliveredGallons:Number(payload['deliveredGallons']??0),
      startingTotalizer:this.optionalNumber(payload['startingTotalizer']),
      endingTotalizer:this.optionalNumber(payload['endingTotalizer']),
      notes:typeof payload['notes']==='string'?payload['notes']:undefined,
      meterPhotoUrl:typeof proof?.['meterPhotoUrl']==='string'?proof['meterPhotoUrl']:undefined,
      equipmentPhotoUrl:typeof proof?.['equipmentPhotoUrl']==='string'?proof['equipmentPhotoUrl']:undefined,
      completedAt:completed.occurredAt,
    };
  }
  private optionalNumber(value:unknown):number|undefined{
    if(value==null||value==='')return undefined;
    const number=Number(value);
    return Number.isFinite(number)?number:undefined;
  }
  private label(value:string):string{return value.replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase());}
}
