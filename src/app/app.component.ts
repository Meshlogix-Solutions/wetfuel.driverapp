import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, briefcaseOutline, homeOutline, notificationsOutline,
  personOutline, timeOutline, wifiOutline, cloudOfflineOutline, callOutline,
  carOutline, warningOutline, cloudOutline, locationOutline, shieldCheckmarkOutline,
  checkmarkCircleOutline, waterOutline, lockClosedOutline, shirtOutline, cameraOutline,
  navigateOutline, bluetoothOutline, clipboardOutline, helpCircleOutline, cardOutline,
  medkitOutline, chevronForwardOutline, logOutOutline, closeOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
  template: '<ion-app><ion-router-outlet></ion-router-outlet></ion-app>'
})
export class AppComponent {
  private readonly router = inject(Router);

  constructor() {
    // Dashboard is the app's home screen - the hardware back button should only ever exit
    // the app from there. Everywhere else it should step back within the app, never exit,
    // regardless of how deep the current WebView history stack happens to be.
    if (Capacitor.isNativePlatform()) {
      App.addListener('backButton', () => {
        if (this.router.url.split('?')[0] === '/dashboard') {
          void App.exitApp();
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          void this.router.navigateByUrl('/dashboard');
        }
      });
    }

    addIcons({
      'arrow-back-outline': arrowBackOutline,
      'briefcase-outline': briefcaseOutline,
      'home-outline': homeOutline,
      'notifications-outline': notificationsOutline,
      'person-outline': personOutline,
      'time-outline': timeOutline,
      'wifi-outline': wifiOutline,
      'cloud-offline-outline': cloudOfflineOutline,
      'call-outline': callOutline,
      'truck-outline': carOutline,
      'warning-outline': warningOutline,
      'cloud-outline': cloudOutline,
      'location-outline': locationOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'water-outline': waterOutline,
      'lock-closed-outline': lockClosedOutline,
      'shirt-outline': shirtOutline,
      'camera-outline': cameraOutline,
      'navigate-outline': navigateOutline,
      'bluetooth-outline': bluetoothOutline,
      'clipboard-outline': clipboardOutline,
      'help-circle-outline': helpCircleOutline,
      'card-outline': cardOutline,
      'medkit-outline': medkitOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'log-out-outline': logOutOutline,
      'close-outline': closeOutline
    });
  }
}
