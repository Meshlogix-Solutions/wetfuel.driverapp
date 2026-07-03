import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { ConnectivityService } from '../services/connectivity.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'wf-mobile-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, IonContent, IonIcon],
  template: `
    <ion-content [fullscreen]="true">
      <div class="app-frame">
        <header class="topbar">
          <div class="topbar-left">
            <a *ngIf="backRoute" class="top-icon" [routerLink]="backRoute" aria-label="Back">
              <ion-icon name="arrow-back-outline"></ion-icon>
            </a>
            <div>
              <div class="eyebrow" *ngIf="subtitle">{{ subtitle }}</div>
              <h1>{{ title }}</h1>
            </div>
          </div>
          <div class="topbar-actions">
            <button *ngIf="showNetwork" class="network-pill" [class.offline]="!connectivity.online()" (click)="connectivity.toggleDemoState()">
              <ion-icon [name]="connectivity.online() ? 'wifi-outline' : 'cloud-offline-outline'"></ion-icon>
              <span class="network-pill-label">{{ connectivity.online() ? 'Online' : 'Offline' }}</span>
            </button>
            <button
              type="button"
              class="theme-toggle"
              (click)="theme.toggle()"
              [attr.title]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
              [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
              <svg class="theme-toggle__icon theme-toggle__icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
              <svg class="theme-toggle__icon theme-toggle__icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
            <a class="top-icon" routerLink="/notifications" aria-label="Notifications">
              <ion-icon name="notifications-outline"></ion-icon><span class="notification-dot"></span>
            </a>
          </div>
        </header>

        <ng-content></ng-content>

        <nav class="bottom-nav" *ngIf="showNav">
          <a routerLink="/dashboard" routerLinkActive="active"><ion-icon name="home-outline"></ion-icon><span>Home</span></a>
          <a routerLink="/jobs" routerLinkActive="active"><ion-icon name="briefcase-outline"></ion-icon><span>Jobs</span></a>
          <a routerLink="/hours" routerLinkActive="active"><ion-icon name="time-outline"></ion-icon><span>Hours</span></a>
          <a routerLink="/profile" routerLinkActive="active"><ion-icon name="person-outline"></ion-icon><span>Profile</span></a>
        </nav>
      </div>
    </ion-content>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    ion-content { flex: 1 1 auto; }
    .app-frame { min-height: 100%; background: var(--wf-background); }
    .topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: max(14px, env(safe-area-inset-top)) 16px 12px; background: color-mix(in srgb, var(--wf-surface) 94%, transparent); backdrop-filter: blur(16px); border-bottom: 1px solid var(--wf-border); }
    .topbar-left, .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .topbar h1 { margin: 1px 0 0; font-size: 22px; letter-spacing: -.035em; color: var(--wf-text); }
    .eyebrow { color: var(--wf-muted); font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: .08em; }
    .top-icon { position: relative; width: 41px; height: 41px; border: 1px solid var(--wf-border); border-radius: 13px; background: var(--wf-surface); display: grid; place-items: center; color: var(--wf-primary); text-decoration: none; flex: 0 0 auto; }
    .top-icon ion-icon { font-size: 21px; }
    .notification-dot { position: absolute; right: 7px; top: 7px; width: 8px; height: 8px; background: var(--wf-accent); border: 2px solid var(--wf-surface); border-radius: 50%; }
    .network-pill { min-height: 36px; border: 1px solid #cde8dc; background: #eaf8f1; color: #1b7b51; border-radius: 999px; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 850; }
    .network-pill.offline { background: #fff2e4; color: #a55b13; border-color: #f0d1ae; }
    .network-pill ion-icon { font-size: 16px; flex: 0 0 auto; }
    .theme-toggle { position: relative; width: 41px; height: 41px; border: 1px solid var(--wf-border); border-radius: 13px; background: var(--wf-surface); display: grid; place-items: center; color: var(--wf-muted); cursor: pointer; flex: 0 0 auto; padding: 0; }
    .theme-toggle__icon { width: 21px; height: 21px; transition: transform .2s ease, opacity .2s ease; }
    .theme-toggle__icon--moon { position: absolute; opacity: 0; transform: rotate(90deg) scale(0); }
    :host-context(html.dark) .theme-toggle__icon--sun { opacity: 0; transform: rotate(-90deg) scale(0); }
    :host-context(html.dark) .theme-toggle__icon--moon { opacity: 1; transform: rotate(0) scale(1); }
    .bottom-nav { position: fixed; z-index: 25; left: 50%; bottom: max(10px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(calc(100% - 24px), 680px); height: 72px; border-radius: 22px; background: color-mix(in srgb, var(--wf-surface) 96%, transparent); backdrop-filter: blur(18px); box-shadow: 0 16px 42px rgba(0,0,0,.18); border: 1px solid var(--wf-border); display: grid; grid-template-columns: repeat(4,1fr); padding: 7px; }
    .bottom-nav a { color: var(--wf-muted); text-decoration: none; display: grid; place-items: center; align-content: center; gap: 4px; border-radius: 15px; font-size: 11px; font-weight: 800; }
    .bottom-nav ion-icon { font-size: 21px; }
    .bottom-nav a.active { color: var(--wf-primary); background: var(--wf-primary-soft); }
    @media(max-width: 430px) { .network-pill { width: 38px; padding: 0; justify-content: center; } .network-pill-label { display: none; } }
  `]
})
export class MobileShellComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() backRoute = '';
  @Input() showNav = false;
  @Input() showNetwork = true;
  readonly connectivity = inject(ConnectivityService);
  readonly theme = inject(ThemeService);
}
