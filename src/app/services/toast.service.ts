import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

/**
 * Shared error/validation toast used in place of the inline "{{ error }}" paragraphs that used
 * to be scattered across pages - those relied on each page's own layout to stay visible (and
 * broke outright when Capacitor plugin callbacks updated them outside Angular's zone). A toast
 * is a single overlay mounted at the app root, so it renders reliably regardless of which page
 * triggered it or what zone triggered it from.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toastController = inject(ToastController);

  async error(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 4000,
      color: 'danger',
      position: 'bottom',
      icon: 'warning-outline',
      buttons: [{ icon: 'close-outline', role: 'cancel' }],
    });
    await toast.present();
  }

  async warning(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 5000,
      color: 'warning',
      position: 'bottom',
      icon: 'location-outline',
      buttons: [{ icon: 'close-outline', role: 'cancel' }],
    });
    await toast.present();
  }
}
