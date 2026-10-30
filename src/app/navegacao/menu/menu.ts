import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
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
  menuOpen = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    readonly financialVisibility: FinancialVisibilityService,
  ) {}

  isLoggedIn(): boolean { return this.authService.isLoggedIn(); }
  closeMenu(restoreFocus = false): void {
    const focusTarget = restoreFocus ? this.menuTrigger?.nativeElement : undefined;
    this.menuOpen = false;
    focusTarget?.focus();
  }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }
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
