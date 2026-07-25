import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DriverAuthService } from '../services/driver-auth.service';

export const driverAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(DriverAuthService);
  const attach = (req: typeof request) => {
    const token = localStorage.getItem('driver_access_token');
    return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  };

  return next(attach(request)).pipe(
    catchError((error: unknown) => {
      // /auth/* calls (login/refresh/logout) are excluded - a failed refresh must not try to refresh itself.
      if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.includes('/auth/')) {
        return from(auth.refreshToken()).pipe(
          switchMap(refreshed => {
            if (!refreshed) {
              auth.expireSession();
              return throwError(() => error);
            }
            return next(attach(request));
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
