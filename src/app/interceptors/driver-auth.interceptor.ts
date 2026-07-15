import { HttpInterceptorFn } from '@angular/common/http';

export const driverAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const token = localStorage.getItem('driver_access_token');
  return next(token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request);
};
