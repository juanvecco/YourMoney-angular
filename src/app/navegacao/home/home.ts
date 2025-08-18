import { Component } from '@angular/core';
import { MenuComponent } from '../menu/menu';
import { FooterComponent } from '../footer/footer';
import { CommonModule } from '@angular/common';
import { ListaDespesasComponent } from '../../components/despesas/lista-despesas/lista-despesas';
import { CadastrarDespesaComponent } from '../../components/despesas/cadastrar-despesa/cadastrar-despesa';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MenuComponent,
    FooterComponent,
    CommonModule,
    ListaDespesasComponent,
    CadastrarDespesaComponent
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent { }