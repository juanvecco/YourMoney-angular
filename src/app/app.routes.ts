import { AuthGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { regraNegocioGuard } from './guards/regra-negocio.guard';
import { Routes } from '@angular/router';
import { HomeComponent } from './navegacao/home/home';
import { LoginPageComponent } from './components/login/login-page/login-page';
import { CadastroPageComponent } from './components/cadastro/cadastro-page/cadastro-page';
import { RecuperarSenhaPageComponent } from './components/auth/recuperar-senha-page/recuperar-senha-page';
import { RedefinirSenhaPageComponent } from './components/auth/redefinir-senha-page/redefinir-senha-page';

export const routes: Routes = [
    { path: '', component: HomeComponent },

    { path: 'login', component: LoginPageComponent },
    { path: 'cadastro', component: CadastroPageComponent },
    { path: 'recuperar-senha', component: RecuperarSenhaPageComponent },
    { path: 'redefinir-senha', component: RedefinirSenhaPageComponent },

    {
        path: 'dashboard',
        loadComponent: () => import('./components/dashboard/dashboard-page/dashboard-page').then(module => module.DashboardPageComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'despesas',
        loadComponent: () => import('./components/despesas/despesas-page/despesas-page').then(module => module.DespesasComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'receitas',
        loadComponent: () => import('./components/receita/receita-page/receita-page').then(module => module.ReceitaPageComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'disponivel',
        loadComponent: () => import('./components/disponivel/disponivel-page/disponivel-page').then(module => module.DisponivelPageComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'investimento',
        loadComponent: () => import('./components/investimento/investimento-page/investimento-page').then(module => module.InvestimentoPageComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'metas',
        loadComponent: () => import('./components/metas/metas-page/metas-page').then(module => module.MetasPageComponent),
        canActivate: [AuthGuard, regraNegocioGuard('metas.mensais')]
    },
    {
        path: 'movimentacoes',
        loadComponent: () => import('./components/movimentacoes/movimentacoes-page/movimentacoes-page').then(module => module.MovimentacoesPageComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'openfinance',
        loadComponent: () => import('./components/openfinance/openfinance-page/openfinance-page')
            .then(module => module.OpenFinancePageComponent),
        canActivate: [AuthGuard, regraNegocioGuard('openfinance.visivel')]
    },
    {
        path: 'configuracao',
        loadComponent: () => import('./components/configuracao/configuracao-page/configuracao-page').then(module => module.ConfiguracaoPageComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'admin/usuarios',
        loadComponent: () => import('./components/admin/usuarios-admin-page')
            .then(module => module.UsuariosAdminPageComponent),
        canActivate: [AuthGuard, adminGuard]
    },

    // fallback
    { path: '**', redirectTo: '' }
];
