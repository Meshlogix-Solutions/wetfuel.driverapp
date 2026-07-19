import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonItem, IonInput, IonCheckbox, IonButton } from '@ionic/angular/standalone';
import { DriverAuthService } from '../services/driver-auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent, IonCard, IonCardContent, IonItem, IonInput, IonCheckbox, IonButton],
  template: `
<ion-content [fullscreen]="true">
  <div class="auth-page">
    <div class="auth-wrap">
      <div class="brand-mark"><img src="/wetfuel-logo.webp" alt="WetFuel" class="brand-logo"></div>
      <ion-card class="auth-card">
        <ion-card-content class="stack">
          <div>
            <h1>Welcome back</h1>
            <p class="page-lead">Sign in to see today's route, complete inspections and record deliveries.</p>
          </div>
          <ion-item><ion-input label="Driver email" labelPlacement="stacked" [(ngModel)]="identity" placeholder="driver@wetfuel.com"></ion-input></ion-item>
          <p class="caption" style="margin:0">You will enter your password on the secure WetFuel sign-in page.</p>
          <div class="row-between"><ion-checkbox labelPlacement="end">Remember me</ion-checkbox><a routerLink="/verification" class="caption">Forgot password?</a></div>
          <ion-button class="wf-button" expand="block" (click)="login()">Sign in securely</ion-button>
         </ion-card-content>
      </ion-card>
    </div>
  </div>
</ion-content>
  `
})
export class LoginPage {
  identity = 'driver@wetfuel.com';
  constructor(private readonly auth: DriverAuthService) {}
  login(): void { void this.auth.login(this.identity); }
}
