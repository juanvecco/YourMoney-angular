import { AuthGuard } from './guards/auth.guard';
import { Routes } from '@angular/router';
import { HomeComponent } from './navegacao/home/home';
import { DespesasComponent } from './components/despesas/despesas-page/despesas-page';
import { ReceitaPageComponent } from './components/receita/receita-page/receita-page';
import { DisponivelPageComponent } from './components/disponivel/disponivel-page/disponivel-page';
import { InvestimentoPageComponent } from './components/investimento/investimento-page/investimento-page';
import { ConfiguracaoPageComponent } from './components/configuracao/configuracao-page/configuracao-page';
import { DashboardPageComponent } from './components/dashboard/dashboard-page/dashboard-page';
import { LoginPageComponent } from './components/login/login-page/login-page';
import { CadastroPageComponent } from './components/cadastro/cadastro-page/cadastro-page';
import { MetasPageComponent } from './components/metas/metas-page/metas-page';

export const routes: Routes = [
    { path: '', component: HomeComponent },

    { path: 'login', component: LoginPageComponent },
    { path: 'cadastro', component: CadastroPageComponent },

    {
        path: 'dashboard',
        component: DashboardPageComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'despesas',
        component: DespesasComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'receitas',
        component: ReceitaPageComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'disponivel',
        component: DisponivelPageComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'investimento',
        component: InvestimentoPageComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'metas',
        component: MetasPageComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'configuracao',
        component: ConfiguracaoPageComponent,
        canActivate: [AuthGuard]
    },

    // fallback
    { path: '**', redirectTo: '' }
];
