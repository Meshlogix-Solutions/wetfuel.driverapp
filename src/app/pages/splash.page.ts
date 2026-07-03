import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [RouterLink, IonContent, IonButton],
  template: `
<ion-content [fullscreen]="true">
  <div class="splash-page">
    <div>
      <div class="splash-logo"><span>WF</span></div>
      <h1>WetFuel</h1>
      <p>Safe, connected fuel delivery.<br>Built for drivers in the field.</p>
      <div style="height:20px"></div>
      <ion-button class="wf-button" color="tertiary" expand="block" routerLink="/login">Start Driver App →</ion-button>
    </div>
  </div>
</ion-content>
  `
})
export class SplashPage {

}
