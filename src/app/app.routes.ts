import { Routes } from '@angular/router';
import { HomeComponent } from './navegacao/home/home';
import { DespesasPageComponent } from './components/despesas/despesas-page/despesas-page';
import { ReceitaPageComponent } from './components/receita/receita-page/receita-page';
import { DisponivelPageComponent } from './components/disponivel/disponivel-page/disponivel-page';
import { ConfiguracaoPageComponent } from './components/configuracao/configuracao-page/configuracao-page';


export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'despesas', component: DespesasPageComponent },
    { path: 'receita', component: ReceitaPageComponent },
    { path: 'disponivel', component: DisponivelPageComponent },
    { path: 'configuracao', component: ConfiguracaoPageComponent },
];
