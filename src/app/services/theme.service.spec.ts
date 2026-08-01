import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let changeListener: ((event: MediaQueryListEvent) => void) | undefined;

  function mockSystemTheme(matches: boolean): void {
    spyOn(window, 'matchMedia').and.callFake(() => ({
      matches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        changeListener = listener as (event: MediaQueryListEvent) => void;
      },
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    }) as MediaQueryList);
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({ providers: [ThemeService] });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => localStorage.clear());

  it('uses and applies a valid persisted preference', () => {
    localStorage.setItem('ym_theme_v1', 'dark');
    service.initialize();
    expect(service.theme()).toBe('dark');
    expect(service.source()).toBe('manual');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('persists a manual toggle without touching route state', () => {
    service.initialize();
    service.setTheme('dark');
    expect(localStorage.getItem('ym_theme_v1')).toBe('dark');
    service.toggleTheme();
    expect(service.theme()).toBe('light');
    expect(localStorage.getItem('ym_theme_v1')).toBe('light');
  });

  it('ignores invalid persisted values', () => {
    mockSystemTheme(true);
    localStorage.setItem('ym_theme_v1', 'sepia');
    service.initialize();
    expect(service.theme()).toBe('dark');
    expect(service.source()).toBe('system');
  });

  it('uses the operating-system preference when there is no manual value', () => {
    mockSystemTheme(true);
    service.initialize();
    expect(service.theme()).toBe('dark');
    expect(service.source()).toBe('system');
    expect(changeListener).toBeDefined();
  });

  it('follows system changes only while no manual preference exists', () => {
    mockSystemTheme(false);
    service.initialize();
    changeListener?.({ matches: true } as MediaQueryListEvent);
    expect(service.theme()).toBe('dark');

    service.setTheme('light');
    changeListener?.({ matches: true } as MediaQueryListEvent);
    expect(service.theme()).toBe('light');
    expect(service.source()).toBe('manual');
  });

  it('falls back to light when matchMedia and storage are unavailable', () => {
    spyOn(window, 'matchMedia').and.returnValue(undefined as unknown as MediaQueryList);
    service.initialize();
    expect(service.theme()).toBe('light');
    expect(service.source()).toBe('fallback');
  });
});
