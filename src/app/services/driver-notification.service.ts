import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { DriverAuthService } from './driver-auth.service';
import { DriverCacheService } from './driver-cache.service';

export interface DriverNotification {
  id: string;
  kind: 'job' | 'certification';
  title: string;
  detail: string;
  route?: string;
  unread: boolean;
}

@Injectable({ providedIn: 'root' })
export class DriverNotificationService {
  private readonly cache = inject(DriverCacheService);
  private readonly auth = inject(DriverAuthService);
  private readIds = new Set<string>();
  private refreshInFlight: Promise<void> | null = null;
  readonly items = signal<DriverNotification[]>([]);
  readonly unreadCount = computed(() => this.items().filter(item => item.unread).length);

  constructor(router: Router) {
    this.readIds = new Set(this.restoreReadIds());
    router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => void this.refresh());
    void this.refresh();
  }

  async refresh(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.load().finally(() => this.refreshInFlight = null);
    return this.refreshInFlight;
  }

  private async load(): Promise<void> {
    try {
      if (!this.cache.hydrated()) {
        await this.cache.loadFromDisk();
      }
      if (!this.cache.jobs().length && !this.cache.profile()) {
        await this.cache.refreshIfOnline();
      }
      const jobs = this.cache.jobs();
      const profile = this.cache.profile();
      const items: DriverNotification[] = [
        ...jobs.filter(job => job.status === 'assigned').map(job => {
          const id = `job:${job.id}`;
          return {
            id,
            kind: 'job' as const,
            title: 'Job assignment',
            detail: `${job.jobNumber} · ${job.customerName} · ${new Date(job.scheduledAt).toLocaleString()}`,
            route: `/jobs/${job.id}`,
            unread: !this.readIds.has(id),
          };
        }),
        ...(profile?.certifications ?? []).filter(item => item.status !== 'valid').map(certification => {
          const id = `certification:${certification.id}:${certification.expiryDate}`;
          return {
            id,
            kind: 'certification' as const,
            title: `${certification.name} reminder`,
            detail: `Expires ${new Date(certification.expiryDate).toLocaleDateString()}. Contact your manager with the renewed document.`,
            unread: !this.readIds.has(id),
          };
        }),
      ];
      this.items.set(items);
    } catch {
      // Preserve the last known count if cache cannot be read.
    }
  }

  markAllRead(): void {
    for (const item of this.items()) this.readIds.add(item.id);
    this.items.update(items => items.map(item => ({ ...item, unread: false })));
    localStorage.setItem(this.storageKey(), JSON.stringify([...this.readIds].slice(-500)));
  }

  private restoreReadIds(): string[] {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey()) ?? '[]') as string[];
    } catch {
      return [];
    }
  }

  private storageKey(): string {
    return `driver_read_notifications:${this.auth.getCurrentUserId() ?? 'anonymous'}`;
  }
}
