import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonCard, IonCardContent, IonIcon } from '@ionic/angular/standalone';
import { DriverNotificationService } from '../services/driver-notification.service';
import { MobileShellComponent } from '../shared/mobile-shell.component';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileShellComponent, IonCard, IonCardContent, IonIcon, IonButton],
  template: `
<wf-mobile-shell title="Notifications" [subtitle]="notifications.items().length + ' active'" backRoute="/dashboard">
  <main class="screen-body stack">
    <div class="row-between">
      <div class="row wrap"><button class="chip active">All</button><button class="chip">Jobs</button><button class="chip">Safety</button></div>
      <ion-button fill="clear" size="small" [disabled]="notifications.unreadCount() === 0" (click)="notifications.markAllRead()">Mark all read</ion-button>
    </div>
    <ion-card *ngFor="let item of notifications.items()" class="wf-card" [routerLink]="item.route || null">
      <ion-card-content class="row">
        <div class="icon-tile"><ion-icon [name]="item.kind === 'job' ? 'water-outline' : 'shield-checkmark-outline'"></ion-icon></div>
        <div class="grow"><strong>{{ item.title }}</strong><p class="caption" style="margin:4px 0 0">{{ item.detail }}</p></div>
        <span *ngIf="item.unread" class="status-dot"></span>
      </ion-card-content>
    </ion-card>
    <ion-card *ngIf="notifications.items().length === 0" class="wf-card soft-card text-center"><ion-card-content><strong>Nothing needs attention</strong><p class="caption">Assignments, sync status and certification reminders will appear here.</p></ion-card-content></ion-card>
  </main>
</wf-mobile-shell>
  `,
})
export class NotificationsPage {
  readonly notifications = inject(DriverNotificationService);

  async ionViewWillEnter(): Promise<void> {
    await this.notifications.refresh();
    this.notifications.markAllRead();
  }
}
