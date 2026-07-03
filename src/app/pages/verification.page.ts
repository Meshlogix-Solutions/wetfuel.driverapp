import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonItem, IonInput, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent, IonCard, IonCardContent, IonItem, IonInput, IonButton],
  template: `
<ion-content [fullscreen]="true">
  <div class="auth-page">
    <div class="auth-wrap">
      <div class="brand-mark"><img src="/wetfuel-logo.webp" alt="WetFuel" class="brand-logo"></div>
      <ion-card class="auth-card">
        <ion-card-content class="stack">
          <div>
            <span class="pill warning">Security check</span>
            <h1>Enter verification code</h1>
            <p class="page-lead">We sent a 6-digit code to <strong>••• ••• 0194</strong>. The code expires in 04:38.</p>
          </div>
          <ion-item><ion-input label="Verification code" labelPlacement="stacked" [(ngModel)]="code" inputmode="numeric" maxlength="6"></ion-input></ion-item>
          <ion-button class="wf-button" expand="block" routerLink="/dashboard">Verify and continue</ion-button>
          <ion-button fill="clear">Resend code</ion-button>
          <a routerLink="/login" class="caption text-center">← Return to password login</a>
        </ion-card-content>
      </ion-card>
    </div>
  </div>
</ion-content>
  `
})
export class VerificationPage {
  code = '';
}
