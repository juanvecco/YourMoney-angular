// import { ApplicationConfig, LOCALE_ID, importProvidersFrom } from '@angular/core';
// import { provideRouter } from '@angular/router';
// import { routes } from './app.routes';
// import { provideHttpClient } from '@angular/common/http';
// import { FormsModule } from '@angular/forms';

// export const appConfig: ApplicationConfig = {
//   providers: [
//     provideRouter(routes),
//     provideHttpClient(),
//     { provide: LOCALE_ID, useValue: 'pt-BR' },
//     importProvidersFrom(FormsModule)
//   ]

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