import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MenuComponent } from './menu';

describe('MenuComponent', () => {
  let fixture: ComponentFixture<MenuComponent>;
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn', 'logout']);

  beforeEach(async () => {
    auth.isLoggedIn.and.returnValue(true);
    await TestBed.configureTestingModule({
      imports: [MenuComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    fixture = TestBed.createComponent(MenuComponent);
    fixture.detectChanges();
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
