import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { inject, provideAppInitializer } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { ThemeService } from './app/services/theme.service';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { driverAuthInterceptor } from './app/interceptors/driver-auth.interceptor';
import { DriverStateService } from './app/services/driver-state.service';

async function startApplication(): Promise<void> {
  await bootstrapApplication(AppComponent, {
    providers: [
      { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
      provideIonicAngular({ mode: 'md' }),
      provideRouter(routes, withComponentInputBinding()),
      provideHttpClient(withInterceptors([driverAuthInterceptor])),
      provideAppInitializer(() => {
        inject(ThemeService).init();
      }),
      provideAppInitializer(() => {
        void inject(DriverStateService).initialize();
      })
    ]
  });
}

void startApplication().catch(error => console.error(error));
