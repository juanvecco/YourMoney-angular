import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { THEME_STORAGE_KEY, ThemeMode, ThemeSource } from '../models/theme.model';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeState = signal<ThemeMode>('light');
  private readonly sourceState = signal<ThemeSource>('fallback');
  private mediaQuery?: MediaQueryList;
  private initialized = false;

  readonly theme = this.themeState.asReadonly();
  readonly source = this.sourceState.asReadonly();

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    const stored = this.readStoredTheme();
    if (stored) {
      this.apply(stored, 'manual');
    } else {
      this.mediaQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
      this.apply(this.mediaQuery?.matches ? 'dark' : 'light', this.mediaQuery ? 'system' : 'fallback');
      this.mediaQuery?.addEventListener('change', this.onSystemThemeChange);
    }
  }

  setTheme(mode: ThemeMode): void {
    try { localStorage.setItem(THEME_STORAGE_KEY, mode); } catch { /* storage can be unavailable */ }
    this.apply(mode, 'manual');
  }

  toggleTheme(): void {
    this.setTheme(this.themeState() === 'light' ? 'dark' : 'light');
  }

  private readonly onSystemThemeChange = (event: MediaQueryListEvent): void => {
    if (this.sourceState() !== 'manual') this.apply(event.matches ? 'dark' : 'light', 'system');
  };

  private readStoredTheme(): ThemeMode | null {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  }

  private apply(mode: ThemeMode, source: ThemeSource): void {
    this.themeState.set(mode);
    this.sourceState.set(source);
    const root = this.document.documentElement;
    root.dataset['theme'] = mode;
    root.style.colorScheme = mode;
  }
}
