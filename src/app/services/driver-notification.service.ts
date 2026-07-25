import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, firstValueFrom, forkJoin } from 'rxjs';
import { DriverApiService } from './driver-api.service';
import { DriverAuthService } from './driver-auth.service';

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
  private readonly api = inject(DriverApiService);
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
      const { jobs, profile } = await firstValueFrom(forkJoin({
        jobs: this.api.getJobs(),
        profile: this.api.getCurrentDriver(),
      }));
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
        ...profile.certifications.filter(item => item.status !== 'valid').map(certification => {
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
      // Preserve the last known count if a background refresh cannot reach the API.
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
