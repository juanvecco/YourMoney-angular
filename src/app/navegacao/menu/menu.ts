import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeToggleComponent } from '../../components/shared/theme-toggle/theme-toggle';

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

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  isLoggedIn(): boolean { return this.authService.isLoggedIn(); }
  closeMenu(restoreFocus = false): void {
    const wasOpen = this.menuOpen;
    this.menuOpen = false;
    if (restoreFocus && wasOpen) queueMicrotask(() => this.menuTrigger?.nativeElement.focus());
  }
  toggleMenu(): void { this.menuOpen = !this.menuOpen; }

  onMenuKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.menuOpen) return;
    event.preventDefault();
    this.closeMenu(true);
  }

  async logout(): Promise<void> {
    this.closeMenu();
    this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
