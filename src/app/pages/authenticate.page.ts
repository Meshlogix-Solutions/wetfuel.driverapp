import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { DriverAuthService } from '../services/driver-auth.service';

@Component({
  selector: 'app-authenticate',
  standalone: true,
  imports: [IonContent, IonButton, RouterLink],
  template: `
    <ion-content>
      <div class="auth-page">
        @if (!error()) {
          <p>Signing you in...</p>
        } @else {
          <p><strong>Sign-in failed</strong></p>
          <p class="caption" style="word-break:break-word">{{ error() }}</p>
          <ion-button routerLink="/login">Back to login</ion-button>
        }
      </div>
    </ion-content>
  `,
})
export class AuthenticatePage implements OnInit {
  private readonly auth = inject(DriverAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    // On native the redirect completes via a deep link (see DriverAuthService's appUrlOpen
    // listener), which lands here only to report a failure via query param - nothing left to do.
    const passedError = this.route.snapshot.queryParamMap.get('error');
    if (passedError) {
      this.error.set(passedError);
      return;
    }

    try {
      await this.auth.completeLogin();
      await this.router.navigateByUrl('/dashboard');
    } catch (err: unknown) {
      // Surface the real failure instead of silently bouncing to /login with no trace of
      // what went wrong - oidc-client-ts errors (state mismatch, invalid_grant, network
      // failure reaching the token endpoint, etc.) all land here.
      const failure = err as { message?: string; error?: string; error_description?: string };
      this.error.set(failure.error_description ?? failure.message ?? failure.error ?? String(err));
    }
  }
}
