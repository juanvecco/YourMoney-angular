import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';
import { ThemeService } from './services/theme.service';

describe('appConfig', () => {
  it('initializes the theme before application startup completes', async () => {
    const themeService = jasmine.createSpyObj<ThemeService>('ThemeService', ['initialize']);
    TestBed.configureTestingModule({
      providers: [
        ...(appConfig.providers ?? []),
        { provide: ThemeService, useValue: themeService },
      ],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(themeService.initialize).toHaveBeenCalledTimes(1);
  });
});
