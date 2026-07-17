import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { DriverAuthService } from '../services/driver-auth.service';

export const driverAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(DriverAuthService);
  const token = localStorage.getItem('driver_access_token');
  return next(token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request).pipe(
      catchError(error => {
        if (error.status === 401) auth.expireSession();
        return throwError(() => error);
      }),
    );
};
