import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { ConnectivityService } from '../services/connectivity.service';

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
              {{ connectivity.online() ? 'Online' : 'Offline' }}
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
    .app-frame { min-height: 100%; background: var(--wf-background); }
    .topbar { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: max(14px, env(safe-area-inset-top)) 16px 12px; background: rgba(245,248,249,.94); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(219,229,233,.78); }
    .topbar-left, .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .topbar h1 { margin: 1px 0 0; font-size: 22px; letter-spacing: -.035em; }
    .eyebrow { color: var(--wf-muted); font-size: 11px; font-weight: 850; text-transform: uppercase; letter-spacing: .08em; }
    .top-icon { position: relative; width: 41px; height: 41px; border: 1px solid var(--wf-border); border-radius: 13px; background: white; display: grid; place-items: center; color: var(--wf-primary); text-decoration: none; flex: 0 0 auto; }
    .top-icon ion-icon { font-size: 21px; }
    .notification-dot { position: absolute; right: 7px; top: 7px; width: 8px; height: 8px; background: var(--wf-accent); border: 2px solid white; border-radius: 50%; }
    .network-pill { min-height: 36px; border: 1px solid #cde8dc; background: #eaf8f1; color: #1b7b51; border-radius: 999px; padding: 0 10px; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 850; }
    .network-pill.offline { background: #fff2e4; color: #a55b13; border-color: #f0d1ae; }
    .bottom-nav { position: fixed; z-index: 25; left: 50%; bottom: max(10px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(calc(100% - 24px), 680px); height: 72px; border-radius: 22px; background: rgba(255,255,255,.96); backdrop-filter: blur(18px); box-shadow: 0 16px 42px rgba(13,47,63,.18); border: 1px solid rgba(219,229,233,.9); display: grid; grid-template-columns: repeat(4,1fr); padding: 7px; }
    .bottom-nav a { color: #7b8d95; text-decoration: none; display: grid; place-items: center; align-content: center; gap: 4px; border-radius: 15px; font-size: 11px; font-weight: 800; }
    .bottom-nav ion-icon { font-size: 21px; }
    .bottom-nav a.active { color: var(--wf-primary); background: var(--wf-primary-soft); }
    @media(max-width: 430px) { .network-pill { width: 38px; padding: 0; justify-content: center; font-size: 0; } }
  `]
})
export class MobileShellComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() backRoute = '';
  @Input() showNav = false;
  @Input() showNetwork = true;
  readonly connectivity = inject(ConnectivityService);
}
