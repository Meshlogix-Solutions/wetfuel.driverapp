import { Routes } from '@angular/router';
import { driverAuthGuard } from './guards/driver-auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'splash' },
  { path: 'splash', loadComponent: () => import('./pages/splash.page').then(m => m.SplashPage) },
  { path: 'login', loadComponent: () => import('./pages/login.page').then(m => m.LoginPage) },
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
      { path: 'job-details', loadComponent: () => import('./pages/job_details.page').then(m => m.JobDetailsPage) },
      { path: 'route-map', loadComponent: () => import('./pages/route_map.page').then(m => m.RouteMapPage) },
      { path: 'arrival', loadComponent: () => import('./pages/arrival.page').then(m => m.ArrivalPage) },
      { path: 'qr-scanner', loadComponent: () => import('./pages/qr_scanner.page').then(m => m.QrScannerPage) },
      { path: 'equipment', loadComponent: () => import('./pages/equipment.page').then(m => m.EquipmentPage) },
      { path: 'meter', loadComponent: () => import('./pages/meter.page').then(m => m.MeterPage) },
      { path: 'fueling', loadComponent: () => import('./pages/fueling.page').then(m => m.FuelingPage) },
      { path: 'delivery-proof', loadComponent: () => import('./pages/delivery_proof.page').then(m => m.DeliveryProofPage) },
      { path: 'delivery-summary', loadComponent: () => import('./pages/delivery_summary.page').then(m => m.DeliverySummaryPage) },
      { path: 'incident', loadComponent: () => import('./pages/incident.page').then(m => m.IncidentPage) },
      { path: 'sync', loadComponent: () => import('./pages/sync.page').then(m => m.SyncPage) },
      { path: 'notifications', loadComponent: () => import('./pages/notifications.page').then(m => m.NotificationsPage) },
      { path: 'history', loadComponent: () => import('./pages/history.page').then(m => m.HistoryPage) },
      { path: 'hours', loadComponent: () => import('./pages/hours.page').then(m => m.HoursPage) },
      { path: 'profile', loadComponent: () => import('./pages/profile.page').then(m => m.ProfilePage) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' }
];
