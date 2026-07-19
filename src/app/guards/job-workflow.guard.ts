import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { DriverStateService } from '../services/driver-state.service';

const STATUS_ROUTE: Record<string, string> = {
  assigned: '',
  started: 'route-map',
  arrived: 'qr-scanner',
  equipment_verified: 'meter',
  fueling: 'fueling',
  proof_pending: 'delivery-summary',
};

export const jobWorkflowGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const state = inject(DriverStateService);
  const router = inject(Router);
  const jobId = route.paramMap.get('jobId');
  if (!jobId) return router.createUrlTree(['/jobs']);

  if (!state.jobs().length) {
    try { await state.refresh(); } catch { /* Cached jobs remain available offline. */ }
  }

  const job = state.jobs().find(item => item.id === jobId);
  if (!job) return router.createUrlTree(['/jobs']);
  state.selectJob(jobId);

  const allowed = (route.data['statuses'] as string[] | undefined) ?? [];
  if (!allowed.length || allowed.includes(job.status)) return true;
  if (job.status === 'completed') return router.createUrlTree(['/history']);
  if (job.status === 'cancelled') return router.createUrlTree(['/jobs', job.id]);
  return router.createUrlTree(['/jobs', job.id, STATUS_ROUTE[job.status] ?? '']);
};
