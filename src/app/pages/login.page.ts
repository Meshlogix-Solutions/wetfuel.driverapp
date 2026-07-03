import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonItem, IonInput, IonCheckbox, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, IonContent, IonCard, IonCardContent, IonItem, IonInput, IonCheckbox, IonButton],
  template: `
<ion-content [fullscreen]="true">
  <div class="auth-page">
    <div class="auth-wrap">
      <div class="brand-mark"><div class="brand-drop"><span>WF</span></div><span>WetFuel Driver</span></div>
      <ion-card class="auth-card">
        <ion-card-content class="stack">
          <div>
            <span class="pill success">Driver access</span>
            <h1>Welcome back</h1>
            <p class="page-lead">Sign in to see today's route, complete inspections and record deliveries.</p>
          </div>
          <ion-item><ion-input label="Email or phone" labelPlacement="stacked" [(ngModel)]="identity" placeholder="driver@wetfuel.com"></ion-input></ion-item>
          <ion-item><ion-input label="Password" labelPlacement="stacked" type="password" [(ngModel)]="password"></ion-input></ion-item>
          <div class="row-between"><ion-checkbox labelPlacement="end">Remember me</ion-checkbox><a routerLink="/verification" class="caption">Forgot password?</a></div>
          <ion-button class="wf-button" expand="block" routerLink="/dashboard">Sign in securely</ion-button>
          <ion-button class="wf-button wf-secondary" expand="block" routerLink="/verification">Sign in with SMS code</ion-button>
          <p class="caption text-center">Tenant: WetFuel Dallas North · WF-001</p>
        </ion-card-content>
      </ion-card>
    </div>
  </div>
</ion-content>
  `
})
export class LoginPage {
  identity = 'dave@wetfuel.com';
  password = '';
}
