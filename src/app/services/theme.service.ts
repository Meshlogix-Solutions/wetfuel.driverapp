import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'wetfuel_driver_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly theme = signal<Theme>('dark');

  init(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    const theme: Theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    this.apply(theme);
    this.theme.set(theme);
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.apply(next);
    this.theme.set(next);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }

  private apply(theme: Theme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }
}
