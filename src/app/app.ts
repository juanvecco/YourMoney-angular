import { Component } from '@angular/core';
import { HomeComponent } from './navegacao/home/home'; // Apenas o HomeComponent é usado no App
import { MenuComponent } from './navegacao/menu/menu';
import { FooterComponent } from './navegacao/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    HomeComponent, // Apenas o HomeComponent é necessário aqui
    MenuComponent,
    FooterComponent
  ],
  templateUrl: './app.html'
})
export class App { }