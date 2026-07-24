import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DriverAuthService } from '../services/driver-auth.service';

// splash/login are entry routes with no auth check of their own - without this, a driver
// with a perfectly valid persisted session still has to click through both screens on
// every app open. Send them straight to the dashboard instead.
export const redirectIfAuthenticatedGuard: CanActivateFn = async () => {
  const auth = inject(DriverAuthService);
  const router = inject(Router);
  return (await auth.hasValidSession()) ? router.createUrlTree(['/dashboard']) : true;
};
