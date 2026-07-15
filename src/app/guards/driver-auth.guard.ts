import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { DriverAuthService } from '../services/driver-auth.service';

export const driverAuthGuard: CanActivateChildFn = async () => {
  const auth = inject(DriverAuthService);
  const router = inject(Router);
  return await auth.hasValidSession() || router.createUrlTree(['/login']);
};
