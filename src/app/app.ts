import { Component, DestroyRef, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { MenuComponent } from './navegacao/menu/menu';
import { FooterComponent } from './navegacao/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MenuComponent,
    FooterComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  readonly isAuthPage = signal(false);

  constructor(private readonly router: Router, destroyRef: DestroyRef) {
    this.updateAuthPage(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((event) => this.updateAuthPage(event.urlAfterRedirects));
  }

  private updateAuthPage(url: string): void {
    const path = url.split(/[?#]/, 1)[0];
    this.isAuthPage.set(path === '/login' || path === '/cadastro');
  }
}
