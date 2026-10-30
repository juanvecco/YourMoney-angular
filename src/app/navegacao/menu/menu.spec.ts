import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { MenuComponent } from './menu';

@Component({ template: '' })
class MenuTestPage {}

describe('MenuComponent', () => {
  let fixture: ComponentFixture<MenuComponent>;
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn', 'logout']);
  let viewport: { matches: boolean; addEventListener: jasmine.Spy; removeEventListener: jasmine.Spy };

  beforeEach(async () => {
    auth.isLoggedIn.and.returnValue(true);
    viewport = { matches: false, addEventListener: jasmine.createSpy(), removeEventListener: jasmine.createSpy() };
    spyOn(window, 'matchMedia').and.returnValue(viewport as unknown as MediaQueryList);
    await TestBed.configureTestingModule({
      imports: [MenuComponent],
      providers: [provideRouter([
        { path: 'login', component: MenuTestPage }, { path: 'dashboard', component: MenuTestPage },
      ]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(MenuComponent);
    fixture.detectChanges();
  });

  it('starts expanded on desktop for an authenticated session', () => {
    fixture.destroy();
    viewport.matches = true;
    fixture = TestBed.createComponent(MenuComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#main-menu').getAttribute('aria-hidden')).toBe('false');
    expect(fixture.nativeElement.querySelector('.ym-menu-trigger').getAttribute('aria-expanded')).toBe('true');
  });

  it('opens the desktop sidebar after login when the menu was created as a guest', async () => {
    fixture.destroy();
    viewport.matches = true;
    auth.isLoggedIn.and.returnValue(false);
    fixture = TestBed.createComponent(MenuComponent);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/login');
    auth.isLoggedIn.and.returnValue(true);
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#main-menu').getAttribute('aria-hidden')).toBe('false');
  });

  it('shows exactly the six primary destinations in the vertical drawer', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll('#main-menu .ym-app-drawer__nav a')) as HTMLAnchorElement[];
    const hrefs = links.map(link => link.getAttribute('href'));
    expect(hrefs).toEqual(['/dashboard', '/receitas', '/despesas', '/investimento', '/metas', '/openfinance']);
  });

  it('has one explicit logout action', () => {
    expect(fixture.nativeElement.querySelectorAll('[data-testid="logout"]')).toHaveSize(1);
    expect(fixture.nativeElement.querySelectorAll('[data-testid="mobile-logout"]')).toHaveSize(0);
  });

  it('keeps global actions in the top bar and out of the destination drawer', () => {
    const actions = fixture.nativeElement.querySelector('.ym-topbar__actions') as HTMLElement;
    const drawer = fixture.nativeElement.querySelector('#main-menu') as HTMLElement;
    expect(actions.querySelector('.ym-topbar__icon-action')?.getAttribute('aria-label')).toMatch(/valores/i);
    expect(actions.querySelector('.ym-theme-toggle--icon-only')).not.toBeNull();
    expect(actions.querySelector('a[href="/configuracao"]')?.textContent).toContain('Configurações');
    expect(actions.querySelector('[data-testid="logout"]')?.textContent).toContain('Sair');
    expect(drawer.querySelector('a[href="/configuracao"]')).toBeNull();
    expect(drawer.querySelector('[data-testid="logout"]')).toBeNull();
  });

  it('exposes the primary mobile destinations', () => {
    const mobileNav = fixture.nativeElement.querySelector('.ym-mobile-nav') as HTMLElement;
    const hrefs = Array.from(mobileNav.querySelectorAll('a')).map((link: unknown) => (link as HTMLAnchorElement).getAttribute('href'));
    expect(hrefs).toEqual(['/dashboard', '/receitas', '/despesas', '/investimento']);
  });

  it('closes with Escape and restores focus to the mobile trigger', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector('.ym-menu-trigger') as HTMLButtonElement;
    const menu = fixture.nativeElement.querySelector('#main-menu') as HTMLElement;
    const focusSpy = spyOn(trigger, 'focus');
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flushMicrotasks();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(focusSpy).toHaveBeenCalled();
  }));
});
