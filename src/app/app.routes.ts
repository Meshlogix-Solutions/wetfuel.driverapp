import { Routes } from '@angular/router';
import { driverAuthGuard } from './guards/driver-auth.guard';
import { jobWorkflowGuard } from './guards/job-workflow.guard';
import { redirectIfAuthenticatedGuard } from './guards/redirect-if-authenticated.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'splash' },
  { path: 'splash', canActivate: [redirectIfAuthenticatedGuard], loadComponent: () => import('./pages/splash.page').then(m => m.SplashPage) },
  { path: 'login', canActivate: [redirectIfAuthenticatedGuard], loadComponent: () => import('./pages/login.page').then(m => m.LoginPage) },
  { path: 'authenticate', loadComponent: () => import('./pages/authenticate.page').then(m => m.AuthenticatePage) },
  { path: 'verification', loadComponent: () => import('./pages/verification.page').then(m => m.VerificationPage) },
  {
    path: '',
    canActivateChild: [driverAuthGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard.page').then(m => m.DashboardPage) },
      { path: 'clock-in', loadComponent: () => import('./pages/clock_in.page').then(m => m.ClockInPage) },
      { path: 'active-shift', loadComponent: () => import('./pages/active_shift.page').then(m => m.ActiveShiftPage) },
      { path: 'vehicle', loadComponent: () => import('./pages/vehicle.page').then(m => m.VehiclePage) },
      { path: 'pre-trip', loadComponent: () => import('./pages/pre_trip.page').then(m => m.PreTripPage) },
      { path: 'jobs', loadComponent: () => import('./pages/jobs.page').then(m => m.JobsPage) },
      { path: 'jobs/:jobId', canActivate:[jobWorkflowGuard], loadComponent: () => import('./pages/job_details.page').then(m => m.JobDetailsPage) },
      { path: 'jobs/:jobId/route-map', canActivate:[jobWorkflowGuard], data:{statuses:['started']}, loadComponent: () => import('./pages/route_map.page').then(m => m.RouteMapPage) },
      { path: 'jobs/:jobId/arrival', canActivate:[jobWorkflowGuard], data:{statuses:['started']}, loadComponent: () => import('./pages/arrival.page').then(m => m.ArrivalPage) },
      { path: 'jobs/:jobId/qr-scanner', canActivate:[jobWorkflowGuard], data:{statuses:['arrived']}, loadComponent: () => import('./pages/qr_scanner.page').then(m => m.QrScannerPage) },
      { path: 'jobs/:jobId/equipment', canActivate:[jobWorkflowGuard], data:{statuses:['arrived']}, loadComponent: () => import('./pages/equipment.page').then(m => m.EquipmentPage) },
      { path: 'jobs/:jobId/meter', canActivate:[jobWorkflowGuard], data:{statuses:['equipment_verified']}, loadComponent: () => import('./pages/meter.page').then(m => m.MeterPage) },
      { path: 'jobs/:jobId/fueling', canActivate:[jobWorkflowGuard], data:{statuses:['equipment_verified']}, loadComponent: () => import('./pages/fueling.page').then(m => m.FuelingPage) },
      { path: 'jobs/:jobId/delivery-proof', canActivate:[jobWorkflowGuard], data:{statuses:['fueled','proof_submitted']}, loadComponent: () => import('./pages/delivery_proof.page').then(m => m.DeliveryProofPage) },
      { path: 'jobs/:jobId/delivery-summary', canActivate:[jobWorkflowGuard], data:{statuses:['proof_submitted']}, loadComponent: () => import('./pages/delivery_summary.page').then(m => m.DeliverySummaryPage) },
      { path: 'job-details', redirectTo: 'jobs' },
      { path: 'route-map', redirectTo: 'jobs' },
      { path: 'arrival', redirectTo: 'jobs' },
      { path: 'qr-scanner', redirectTo: 'jobs' },
      { path: 'equipment', redirectTo: 'jobs' },
      { path: 'meter', redirectTo: 'jobs' },
      { path: 'fueling', redirectTo: 'jobs' },
      { path: 'delivery-proof', redirectTo: 'jobs' },
      { path: 'delivery-summary', redirectTo: 'jobs' },
      { path: 'incident', loadComponent: () => import('./pages/incident.page').then(m => m.IncidentPage) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications.page').then(m => m.NotificationsPage) },
      { path: 'history', loadComponent: () => import('./pages/history.page').then(m => m.HistoryPage) },
      { path: 'hours', loadComponent: () => import('./pages/hours.page').then(m => m.HoursPage) },
      { path: 'profile', loadComponent: () => import('./pages/profile.page').then(m => m.ProfilePage) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' }
];
