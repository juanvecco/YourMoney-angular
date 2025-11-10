import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
// import { HomeComponent } from './navegacao/home/home';
import { MenuComponent } from './navegacao/menu/menu';
import { FooterComponent } from './navegacao/footer/footer';
import { DespesasPageComponent } from './components/despesas/despesas-page/despesas-page';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  imports: [
    RouterOutlet,
    // HomeComponent,
    MenuComponent,
    FooterComponent,
    DespesasPageComponent,
    CommonModule
  ]
})
export class AppComponent {
  constructor(private router: Router) { }

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }
}
