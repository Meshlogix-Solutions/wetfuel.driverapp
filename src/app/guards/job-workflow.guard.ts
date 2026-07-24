import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { DriverStateService } from '../services/driver-state.service';

const STATUS_ROUTE: Record<string, string> = {
  assigned: '',
  started: 'route-map',
  arrived: 'qr-scanner',
  equipment_verified: 'meter',
  fueled: 'delivery-proof',
  proof_submitted: 'delivery-summary',
};

// delivery-summary reads deliveredGallons/deliveryDraft from in-memory signals that are only
// populated by going through delivery-proof in this session - they're never persisted server
// side until the final completeDelivery call. If those signals are empty (app reload, or
// landing on a proof_submitted job without visiting delivery-proof first), delivery-summary has
// nothing to show, so route to delivery-proof instead where the driver can re-enter/re-submit.
function resolveTarget(status: string, state: DriverStateService): string {
  if (status === 'proof_submitted' && !state.deliveredGallons()) return 'delivery-proof';
  return STATUS_ROUTE[status] ?? '';
}

export const jobWorkflowGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const state = inject(DriverStateService);
  const router = inject(Router);
  const jobId = route.paramMap.get('jobId');
  if (!jobId) return router.createUrlTree(['/jobs']);

  // Always fetch just this one job - fresh from the server on every job-scoped navigation,
  // not a lookup against a previously loaded list.
  const job = await state.loadJob(jobId);
  if (!job) return router.createUrlTree(['/jobs']);

  const allowed = (route.data['statuses'] as string[] | undefined) ?? [];
  if (allowed.length) {
    if (allowed.includes(job.status)) return true;
    if (job.status === 'completed') return router.createUrlTree(['/history']);
    if (job.status === 'cancelled') return router.createUrlTree(['/jobs', job.id]);
    return router.createUrlTree(['/jobs', job.id, resolveTarget(job.status, state)]);
  }

  // Base /jobs/:jobId route (no statuses restriction): land directly on the page for
  // the job's current step instead of the hub, e.g. an "equipment_verified" job opens
  // straight to the meter/fueling page. 'assigned' maps to '' (stay here) and
  // 'completed'/'cancelled' aren't in STATUS_ROUTE, so they fall through and stay on
  // job_details too.
  const target = resolveTarget(job.status, state);
  return target ? router.createUrlTree(['/jobs', job.id, target]) : true;
};
