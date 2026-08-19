import { Component, OnDestroy } from '@angular/core';
import { IonContent, NavController, ViewDidEnter } from '@ionic/angular/standalone';
import { LoaderComponent } from '../shared/loader.component';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [IonContent, LoaderComponent],
  template: `
<ion-content [fullscreen]="true" class="splash-content">
  <div class="splash-page">
    <div class="splash-inner">
      <img src="/wetfuel-logo.webp" alt="WetFuel" class="splash-logo">
      <p>Safe, connected fuel delivery.<br>Built for drivers in the field.</p>
      <div class="splash-loader">
        <wf-loader />
      </div>
    </div>
  </div>
</ion-content>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .splash-content {
      --background: var(--wf-primary);
    }
    .splash-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: splash-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .splash-logo {
      animation: splash-logo 0.85s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .splash-inner p {
      animation: splash-copy 0.8s 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    .splash-loader {
      margin-top: 12px;
      animation: splash-copy 0.8s 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
      --wf-primary: #fff;
      --wf-primary-shade: #fff;
      --wf-primary-soft: rgba(255, 255, 255, 0.28);
      --wf-border: rgba(255, 255, 255, 0.38);
      --wf-muted: rgba(255, 255, 255, 0.85);
    }
    .splash-loader ::ng-deep .wetfuel-loader.section {
      padding: 1.25rem 0 0;
    }
    @keyframes splash-rise {
      from { opacity: 0; transform: translateY(28px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes splash-logo {
      from { opacity: 0; transform: scale(0.82); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes splash-copy {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class SplashPage implements ViewDidEnter, OnDestroy {
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private navCtrl: NavController) {}

  ionViewDidEnter() {
    this.timer = setTimeout(() => {
      void this.navCtrl.navigateRoot('/login', { animated: true, animationDirection: 'forward' });
    }, 2500);
  }

  ngOnDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }
}
