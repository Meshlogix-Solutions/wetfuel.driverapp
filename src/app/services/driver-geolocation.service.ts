import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface DriverPosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

@Injectable({ providedIn: 'root' })
export class DriverGeolocationService {
  async ensurePermission(): Promise<boolean> {
    try {
      if (!Capacitor.isNativePlatform()) return true;
      let status = await Geolocation.checkPermissions();
      if (this.granted(status.location) || this.granted(status.coarseLocation)) return true;
      status = await Geolocation.requestPermissions();
      return this.granted(status.location) || this.granted(status.coarseLocation);
    } catch (error) {
      throw new Error(this.friendlyError((error as Error).message));
    }
  }

  async getCurrentPosition(): Promise<DriverPosition> {
    if (!(await this.ensurePermission())) throw new Error(this.deniedMessage());
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 30000,
    });
    return this.toPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
  }

  async watchPosition(
    onPosition: (position: DriverPosition) => void,
    onError: (message: string) => void,
  ): Promise<string> {
    if (!(await this.ensurePermission())) {
      onError(this.deniedMessage());
      return '';
    }
    return Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 },
      (position, error) => {
        if (error || !position) {
          onError(this.friendlyError(error?.message));
          return;
        }
        onPosition(this.toPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy));
      },
    );
  }

  async clearWatch(id: string): Promise<void> {
    if (id) await Geolocation.clearWatch({ id });
  }

  friendlyError(message?: string): string {
    if (!message) return 'Location could not be determined.';
    if (/denied/i.test(message)) return this.deniedMessage();
    return message;
  }

  private granted(state?: string): boolean {
    return state === 'granted';
  }

  private deniedMessage(): string {
    return 'Location permission is required. Allow location for WetFuel Driver in Settings, then try again.';
  }

  private toPosition(latitude: number, longitude: number, accuracy?: number | null): DriverPosition {
    return { latitude, longitude, accuracyMeters: accuracy ?? 0 };
  }
}
