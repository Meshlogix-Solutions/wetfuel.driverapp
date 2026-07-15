import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
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
  hoursThisWeek: number;
}

export interface DriverVehicle {
  id: string;
  name: string;
  unitNumber: string;
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
  siteName: string;
  siteAddress: string;
  scheduledAt: string;
  targetGallons: number;
  fuelType: string;
  distanceMiles?: number;
  status: string;
  equipmentCode?: string;
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
  breakMinutes: number;
  durationHours: number;
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

export interface DriverBootstrap {
  profile: DriverProfile;
  activeShift?: DriverShift;
  shifts: DriverShift[];
  vehicles: DriverVehicle[];
  jobs: DriverJob[];
  recentDeliveries: DriverDelivery[];
  serverTime: string;
}

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

  bootstrap(): Observable<DriverBootstrap> {
    return this.http.get<ApiResponse<DriverBootstrap>>(
      `${environment.apiUrl}/driver/app/bootstrap`
    ).pipe(map(response => response.data));
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
}
