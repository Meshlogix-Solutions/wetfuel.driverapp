import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonItem, IonInput, IonButton, IonIcon } from '@ionic/angular/standalone';
import { LoaderComponent } from '../shared/loader.component';
import { DriverAuthService } from '../services/driver-auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IonContent, IonCard, IonCardContent, IonItem, IonInput, IonButton, IonIcon, LoaderComponent],
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
          <ion-item><ion-input label="Password" labelPlacement="stacked" [type]="showPassword() ? 'text' : 'password'" [(ngModel)]="password"><ion-icon slot="end" style="cursor:pointer" [name]="showPassword() ? 'eye-off-outline' : 'eye-outline'" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" (click)="showPassword.set(!showPassword())"></ion-icon></ion-input></ion-item>
          <ion-button class="wf-button" expand="block" [disabled]="loading" (click)="login()">
            @if (loading) { <wf-loader mode="button" /> }
            {{ loading ? 'Signing in...' : 'Sign in securely' }}
          </ion-button>
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
  readonly showPassword = signal(false);

  constructor(
    private readonly auth: DriverAuthService,
    private readonly router: Router,
    private readonly toast: ToastService,
  ) {}

  ionViewWillEnter(): void {
    this.loading = false;
  }

  async login(): Promise<void> {
    this.loading = true;
    try {
      await this.auth.login(this.identity, this.password);
      this.loading = false;
      await this.router.navigateByUrl('/dashboard');
    } catch (err: unknown) {
      const failure = err as { error?: { message?: string }; message?: string };
      void this.toast.error(failure.error?.message ?? failure.message ?? 'Invalid email or password.');
    } finally {
      this.loading = false;
    }
  }
}
