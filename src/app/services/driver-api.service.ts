import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, catchError, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DriverProfile {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  shiftStatus: string;
  license: { type: string; number: string; state: string; expiryDate: string };
  certifications: Array<{ id: string; name: string; expiryDate: string; status: string }>;
  assignedVehicleId?: string;
  assignedVehicleName?: string;
  assignedVehicles?: DriverVehicle[];
  hoursThisWeek: number;
}

export interface DriverVehicle {
  id: string;
  name: string;
  unitNumber: string;
  licensePlate: string;
  make?: string;
  model?: string;
  year?: number;
  capacityGallons: number;
  inventoryGallons: number;
  meterIdentifier?: string;
  complianceCurrent: boolean;
}

export interface DriverJob {
  id: string;
  jobNumber: string;
  customerName: string;
  customerPhone?: string;
  siteName: string;
  siteAddress: string;
  scheduledAt: string;
  targetGallons: number;
  fueledGallons?: number;
  fuelType: string;
  distanceMiles?: number;
  status: string;
  equipmentCode?: string;
  equipmentId?: string;
  equipmentName?: string;
  equipmentType?: string;
  equipmentQrCode?: string;
  equipmentCapacityGallons?: number;
  siteContactName?: string;
  siteContactPhone?: string;
  deliveryInstructions?: string;
  safetyNote?: string;
  latitude?: number;
  longitude?: number;
}

export interface DriverShift {
  id: string;
  status: string;
  vehicleId?: string;
  startedAt: string;
  endedAt?: string;
  breakStartedAt?: string;
  breakMinutes: number;
  durationHours: number;
  vehicle?: DriverVehicle;
}

export interface DriverDelivery {
  id: string;
  jobId: string;
  jobNumber: string;
  customerName: string;
  equipmentName?: string;
  deliveredGallons: number;
  completedAt: string;
}
export interface DriverDashboardSummary { plannedJobs:number; completedJobs:number; plannedGallons:number; deliveredGallons:number; }
export interface DriverDashboardJobs { activeJob:DriverJob|null; nextJob:DriverJob|null; nextJobSequence:number; }
export interface DriverEquipment {id:string;customerId:string;customerName:string;siteId:string;siteName:string;siteAddress:string;name:string;type:string;manufacturer?:string;model?:string;serialNumber?:string;capacityGallons?:number;fuelType:string;qrCode:string;status:string;estimatedLevelPercent?:number;latitude?:number;longitude?:number;photoUrl?:string;accessNotes?:string;}

export interface OfflineDriverEvent {
  clientEventId: string;
  eventType: string;
  aggregateId?: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

interface ApiResponse<T> { data: T }

@Injectable({ providedIn: 'root' })
export class DriverApiService {
  private readonly http = inject(HttpClient);

  // Each call below fetches exactly what one screen needs, scoped to the logged-in
  // driver server-side - no bootstrap-everything call.
  getCurrentDriver(): Observable<DriverProfile> {
    return this.http.get<ApiResponse<DriverProfile>>(`${environment.apiUrl}/driver/me`)
      .pipe(map(response => response.data));
  }

  getJobs(): Observable<DriverJob[]> {
    return this.http.get<ApiResponse<DriverJob[]>>(`${environment.apiUrl}/driver/app/jobs`)
      .pipe(map(response => response.data));
  }

  getJob(id: string): Observable<DriverJob> {
    return this.http.get<ApiResponse<DriverJob>>(`${environment.apiUrl}/driver/app/jobs/${id}`)
      .pipe(map(response => response.data));
  }

  getActiveShift(): Observable<DriverShift | null> {
    return this.http.get<ApiResponse<DriverShift | null>>(`${environment.apiUrl}/driver/app/shift/active`)
      .pipe(map(response => response.data));
  }

  getShifts(): Observable<DriverShift[]> {
    return this.http.get<ApiResponse<DriverShift[]>>(`${environment.apiUrl}/driver/app/shifts`)
      .pipe(map(response => response.data));
  }

  getVehicles(): Observable<DriverVehicle[]> {
    return this.http.get<ApiResponse<DriverVehicle[]>>(`${environment.apiUrl}/driver/app/vehicles`)
      .pipe(map(response => response.data));
  }

  getRecentDeliveries(): Observable<DriverDelivery[]> {
    return this.http.get<ApiResponse<DriverDelivery[]>>(`${environment.apiUrl}/driver/app/deliveries/recent`)
      .pipe(map(response => response.data));
  }

  getDashboardSummary(start: Date, end: Date): Observable<DriverDashboardSummary> {
    const params = { start: start.toISOString(), end: end.toISOString() };
    return this.http.get<ApiResponse<DriverDashboardSummary>>(`${environment.apiUrl}/driver/app/dashboard-summary`, { params })
      .pipe(map(response => response.data));
  }

  getDashboardJobs(): Observable<DriverDashboardJobs> {
    return this.http.get<ApiResponse<DriverDashboardJobs>>(`${environment.apiUrl}/driver/app/dashboard-jobs`)
      .pipe(
        map(response => response.data),
        catchError(() => this.getJobs().pipe(map(jobs => {
          const activeStatuses = ['started', 'arrived', 'equipment_verified', 'fueled', 'proof_submitted'];
          const activeJob = jobs.find(job => activeStatuses.includes(job.status)) ?? null;
          const assigned = jobs.filter(job => job.status === 'assigned')
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
          return { activeJob, nextJob:assigned[0] ?? null, nextJobSequence:assigned.length ? 1 : 0 };
        }))),
      );
  }

  sync(events: OfflineDriverEvent[]): Observable<{
    acceptedEventIds: string[];
    alreadyProcessedEventIds: string[];
    serverTime: string;
  }> {
    return this.http.post<ApiResponse<{
      acceptedEventIds: string[];
      alreadyProcessedEventIds: string[];
      serverTime: string;
    }>>(`${environment.apiUrl}/driver/app/sync`, { events })
      .pipe(map(response => response.data));
  }

  recordLocation(jobId: string, latitude: number, longitude: number, accuracyMeters: number): Observable<void> {
    const event: OfflineDriverEvent = {
      clientEventId: crypto.randomUUID(),
      eventType: 'location.recorded',
      aggregateId: jobId,
      occurredAt: new Date().toISOString(),
      payload: { latitude, longitude, accuracyMeters },
    };
    return this.sync([event]).pipe(map(() => undefined));
  }

  lookupEquipment(jobId:string,qrCode:string):Observable<DriverEquipment>{
    return this.http.get<ApiResponse<DriverEquipment>>(`${environment.apiUrl}/equipment/driver/jobs/${jobId}/lookup?qrCode=${encodeURIComponent(qrCode)}`).pipe(map(response=>response.data));
  }

  uploadFile(file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ApiResponse<{ filePath: string }>>(`${environment.apiUrl}/user/UploadFile`, form)
      .pipe(map(response => response.data.filePath));
  }

  deleteUploadedFile(url: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/user/UploadFile`, { params: { url } });
  }
}
