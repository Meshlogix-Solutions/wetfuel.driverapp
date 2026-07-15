import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { DriverAuthService } from '../services/driver-auth.service';

@Component({
  selector: 'app-authenticate',
  standalone: true,
  imports: [IonContent],
  template: '<ion-content><div class="auth-page"><p>Signing you in...</p></div></ion-content>',
})
export class AuthenticatePage implements OnInit {
  private readonly auth = inject(DriverAuthService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    try {
      await this.auth.completeLogin();
      await this.router.navigateByUrl('/dashboard');
    } catch {
      await this.router.navigateByUrl('/login');
    }
  }
}
