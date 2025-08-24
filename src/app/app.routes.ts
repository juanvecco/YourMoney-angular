import { Routes } from '@angular/router';
import { HomeComponent } from './navegacao/home/home';
import { DespesasPageComponent } from './components/despesas/despesas-page/despesas-page';
import { ReceitaPageComponent } from './components/receita/receita-page/receita-page';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'despesas', component: DespesasPageComponent },
    { path: 'receita', component: ReceitaPageComponent }
];
