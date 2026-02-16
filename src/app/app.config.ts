import { ApplicationConfig, importProvidersFrom, LOCALE_ID, } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
// import { tokenInterceptor } from './interceptors/token.interceptor';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    // provideHttpClient(withInterceptors([tokenInterceptor])),
    importProvidersFrom(FormsModule, CommonModule),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ]
};