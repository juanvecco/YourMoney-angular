import { Routes } from '@angular/router';
import { HomeComponent } from './navegacao/home/home';
import { DespesasPageComponent } from './components/despesas/despesas-page/despesas-page';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'despesas', component: DespesasPageComponent }
];
