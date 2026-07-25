import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonItem, IonInput, IonCheckbox, IonButton } from '@ionic/angular/standalone';
import { DriverAuthService } from '../services/driver-auth.service';
import { ToastService } from '../services/toast.service';

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
          <ion-item><ion-input label="Password" labelPlacement="stacked" type="password" [(ngModel)]="password"></ion-input></ion-item>
          <div class="row-between"><ion-checkbox labelPlacement="end">Remember me</ion-checkbox><a routerLink="/verification" class="caption">Forgot password?</a></div>
          <ion-button class="wf-button" expand="block" [disabled]="loading" (click)="login()">{{ loading ? 'Signing in...' : 'Sign in securely' }}</ion-button>
         </ion-card-content>
      </ion-card>
    </div>
  </div>
</ion-content>
  `
})
export class LoginPage {
  identity = 'driver@wetfuel.com';
  password = '';
  loading = false;
  constructor(
    private readonly auth: DriverAuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {}

  async login(): Promise<void> {
    this.loading = true;
    try {
      await this.auth.login(this.identity, this.password);
      await this.router.navigateByUrl('/dashboard');
    } catch (err: unknown) {
      const failure = err as { error?: { message?: string }; message?: string };
      void this.toast.error(failure.error?.message ?? failure.message ?? 'Invalid email or password.');
    } finally {
      this.loading = false;
    }
  }
}
