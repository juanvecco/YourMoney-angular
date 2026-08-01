import { ApplicationConfig, importProvidersFrom, inject, LOCALE_ID, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './interceptors/token.interceptor';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ThemeService } from './services/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    importProvidersFrom(FormsModule, CommonModule),
    provideAppInitializer(() => inject(ThemeService).initialize()),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ]
};
