import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface LocationSettingsPlugin {
  open(): Promise<void>;
}

const LocationSettings = registerPlugin<LocationSettingsPlugin>('LocationSettings');

export interface DriverPosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

@Injectable({ providedIn: 'root' })
export class DriverGeolocationService {
  async hasPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return true;
    const status = await Geolocation.checkPermissions();
    return this.granted(status.location) || this.granted(status.coarseLocation);
  }

  async ensurePermission(): Promise<boolean> {
    try {
      if (await this.hasPermission()) return true;
      const status = await Geolocation.requestPermissions();
      return this.granted(status.location) || this.granted(status.coarseLocation);
    } catch (error) {
      throw new Error(this.friendlyError((error as Error).message));
    }
  }

  async getCurrentPosition(): Promise<DriverPosition> {
    if (!(await this.ensurePermission())) throw new Error(this.deniedMessage());
    const position = await Geolocation.getCurrentPosition(this.quietOptions());
    return this.toPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
  }

  async promptForLocation(): Promise<DriverPosition> {
    try {
      const position = await Geolocation.getCurrentPosition(this.promptOptions());
      return this.toPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
    } catch (error) {
      throw new Error(this.friendlyError(error));
    }
  }

  async watchPosition(
    onPosition: (position: DriverPosition) => void,
    onError: (message: string) => void,
  ): Promise<string> {
    return Geolocation.watchPosition(
      this.promptOptions(),
      (position, error) => {
        if (error || !position) {
          onError(this.friendlyError(error));
          return;
        }
        onPosition(this.toPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy));
      },
    );
  }

  async clearWatch(id: string): Promise<void> {
    if (id) await Geolocation.clearWatch({ id });
  }

  friendlyError(error?: unknown): string {
    const message = this.describe(error);
    if (!message) return 'Location could not be determined.';
    if (/location services are not enabled|enable location was denied|location settings|network and location turned off|could not obtain location in time|OS-PLUG-GLOC-0007|OS-PLUG-GLOC-0009|OS-PLUG-GLOC-0010|OS-PLUG-GLOC-0016|OS-PLUG-GLOC-0017/i.test(message)) {
      return 'Turn location on, then try again.';
    }
    if (/denied/i.test(message)) return this.deniedMessage();
    return message;
  }

  async openLocationSettings(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return false;
    await LocationSettings.open();
    return true;
  }

  private promptOptions() {
    return {
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 300000,
      enableLocationFallback: false,
    };
  }

  private quietOptions() {
    return {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 30000,
      enableLocationFallback: true,
    };
  }

  private describe(error: unknown): string {
    if (!error) return '';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
      return `${code} ${error.message}`.trim();
    }
    return String(error);
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
