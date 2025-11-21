import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MenuComponent } from './navegacao/menu/menu';
import { FooterComponent } from './navegacao/footer/footer';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MenuComponent,
    FooterComponent,
    CommonModule
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  constructor(private router: Router) { }

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }
}