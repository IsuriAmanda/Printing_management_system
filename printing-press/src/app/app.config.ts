import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideAnimations } from '@angular/platform-browser/animations';

import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import {provideHttpClient,withInterceptorsFromDi, withFetch} from '@angular/common/http';
import {HTTP_INTERCEPTORS} from '@angular/common/http';
import {AuthInterceptor} from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimations(),
 
    provideCharts(withDefaultRegisterables()),
provideHttpClient(
  withFetch(),
  withInterceptorsFromDi()
),
  {

    provide: HTTP_INTERCEPTORS,

    useClass: AuthInterceptor,

    multi: true

  }
  ]
};