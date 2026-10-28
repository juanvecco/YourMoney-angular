import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
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
  @ViewChild('moreTrigger') private moreTrigger?: ElementRef<HTMLButtonElement>;
  menuOpen = false;
  moreOpen = false;
  sidebarCollapsed = this.carregarPreferenciaLateral();

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    readonly financialVisibility: FinancialVisibilityService,
  ) {}

  isLoggedIn(): boolean { return this.authService.isLoggedIn(); }
  closeMenu(restoreFocus = false): void {
    const focusTarget = restoreFocus
      ? (this.moreOpen ? this.moreTrigger?.nativeElement : this.menuTrigger?.nativeElement)
      : undefined;
    this.menuOpen = false;
    this.moreOpen = false;
    focusTarget?.focus();
  }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
  toggleMore(): void { this.moreOpen = !this.moreOpen; }
  toggleFinancialValues(): void { this.financialVisibility.toggle(); }
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    try {
      localStorage.setItem('yourmoney-sidebar-collapsed', String(this.sidebarCollapsed));
    } catch {
      // A navegação continua funcionando quando o navegador bloqueia armazenamento local.
    }
  }

  private carregarPreferenciaLateral(): boolean {
    try {
      return typeof localStorage !== 'undefined'
        && localStorage.getItem('yourmoney-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  }

  onMenuKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || (!this.menuOpen && !this.moreOpen)) return;
    event.preventDefault();
    this.closeMenu(true);
  }

  async logout(): Promise<void> {
    this.closeMenu();
    this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
