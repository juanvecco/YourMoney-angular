import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ThemeService } from '../../../services/theme.service';
import { ThemeToggleComponent } from './theme-toggle';

describe('ThemeToggleComponent', () => {
  it('exposes the destination theme and delegates toggle', async () => {
    const theme = jasmine.createSpyObj<ThemeService>('ThemeService', ['toggleTheme'], { theme: signal<'light' | 'dark'>('light') });
    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [{ provide: ThemeService, useValue: theme }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button.getAttribute('aria-label')).toContain('escuro');
    button.click();
    expect(theme.toggleTheme).toHaveBeenCalled();
  });
});
