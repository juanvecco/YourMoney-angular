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

  it('exposes every authenticated destination including Disponível', () => {
    const hrefs = Array.from(fixture.nativeElement.querySelectorAll('a')).map((link: unknown) => (link as HTMLAnchorElement).getAttribute('href'));
    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/receitas');
    expect(hrefs).toContain('/despesas');
    expect(hrefs).toContain('/disponivel');
    expect(hrefs).toContain('/investimento');
    expect(hrefs).toContain('/metas');
    expect(hrefs).toContain('/configuracao');
  });

  it('has one explicit logout action', () => {
    expect(fixture.nativeElement.querySelectorAll('[data-testid="logout"]')).toHaveSize(1);
  });

  it('closes with Escape and restores focus to the mobile trigger', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector('.ym-menu-trigger') as HTMLButtonElement;
    const menu = fixture.nativeElement.querySelector('#main-menu') as HTMLElement;
    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    flushMicrotasks();
    fixture.detectChanges();

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  }));
});
