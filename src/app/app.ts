import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
// import { HomeComponent } from './navegacao/home/home';
import { MenuComponent } from './navegacao/menu/menu';
import { FooterComponent } from './navegacao/footer/footer';
import { DespesasPageComponent } from './components/despesas/despesas-page/despesas-page';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    // HomeComponent,
    MenuComponent,
    FooterComponent,
    DespesasPageComponent
  ],
  templateUrl: './app.html',
  styles: []
})
export class App { }