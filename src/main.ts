import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { inject, provideAppInitializer } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { ThemeService } from './app/services/theme.service';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      inject(ThemeService).init();
    })
  ]
}).catch(error => console.error(error));
