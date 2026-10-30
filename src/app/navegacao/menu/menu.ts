import { Component, DestroyRef, ElementRef, HostListener, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ThemeToggleComponent } from '../../components/shared/theme-toggle/theme-toggle';
import { FinancialVisibilityService } from '../../services/financial-visibility.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './menu.html',
  styleUrls: ['./menu.scss']
})
export class MenuComponent {
  @ViewChild('menuTrigger') private menuTrigger?: ElementRef<HTMLButtonElement>;
  menuOpen = false;
  private wasLoggedIn = false;
  private readonly desktopViewport = typeof matchMedia === 'function' ? matchMedia('(min-width: 981px)') : undefined;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    readonly financialVisibility: FinancialVisibilityService,
    destroyRef: DestroyRef,
  ) {
    this.wasLoggedIn = this.isLoggedIn();
    this.menuOpen = this.wasLoggedIn && !!this.desktopViewport?.matches;
    const onViewportChange = (event: MediaQueryListEvent) => {
      this.menuOpen = this.isLoggedIn() && event.matches;
    };
    this.desktopViewport?.addEventListener('change', onViewportChange);
    destroyRef.onDestroy(() => this.desktopViewport?.removeEventListener('change', onViewportChange));
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd), takeUntilDestroyed(destroyRef),
    ).subscribe(() => {
      const loggedIn = this.isLoggedIn();
      if (loggedIn !== this.wasLoggedIn) {
        this.menuOpen = loggedIn && !!this.desktopViewport?.matches;
        this.wasLoggedIn = loggedIn;
      }
    });
  }

  isLoggedIn(): boolean { return this.authService.isLoggedIn(); }
  closeMenu(restoreFocus = false): void {
    const focusTarget = restoreFocus ? this.menuTrigger?.nativeElement : undefined;
    this.menuOpen = false;
    focusTarget?.focus();
  }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  onNavigate(): void {
    if (!this.isLoggedIn() || !this.desktopViewport?.matches) this.closeMenu();
  }
  toggleFinancialValues(): void { this.financialVisibility.toggle(); }

  @HostListener('document:keydown.escape', ['$event'])
  onMenuKeydown(event: Event): void {
    if (!this.menuOpen) return;
    event.preventDefault();
    this.closeMenu(true);
  }

  async logout(): Promise<void> {
    this.closeMenu();
    this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
