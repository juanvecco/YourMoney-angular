import { ApplicationConfig, importProvidersFrom, LOCALE_ID, } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(FormsModule, CommonModule),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ]
};