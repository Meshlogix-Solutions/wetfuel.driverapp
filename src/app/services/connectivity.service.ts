import { Injectable, signal } from '@angular/core';
import { Network } from '@capacitor/network';

/** Real device/network status via Capacitor Network (native + web). */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  readonly online = signal(true);
  readonly connectionType = signal<string>('unknown');

  private readonly listeners = new Set<(online: boolean) => void>();

  constructor() {
    void this.init();
  }

  /** Subscribe to connectivity changes. Returns an unsubscribe function. */
  onChange(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async init(): Promise<void> {
    const status = await Network.getStatus();
    this.applyStatus(status.connected, status.connectionType);

    await Network.addListener('networkStatusChange', event => {
      this.applyStatus(event.connected, event.connectionType);
    });
  }

  private applyStatus(connected: boolean, connectionType: string): void {
    const previous = this.online();
    this.online.set(connected);
    this.connectionType.set(connectionType);
    if (previous !== connected) {
      for (const listener of this.listeners) listener(connected);
    }
  }
}
