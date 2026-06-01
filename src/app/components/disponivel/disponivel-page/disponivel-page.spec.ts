import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { DisponivelPageComponent } from './disponivel-page';
import { ReceitaService } from '../../../services/receita';
import { DespesaService } from '../../../services/despesa';
import { AuthService } from '../../../services/auth.service';

describe('DisponivelPageComponent', () => {
  let component: DisponivelPageComponent;
  let receitaService: jasmine.SpyObj<ReceitaService>;
  let despesaService: jasmine.SpyObj<DespesaService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    receitaService = jasmine.createSpyObj<ReceitaService>('ReceitaService', ['obterPorReferencia']);
    despesaService = jasmine.createSpyObj<DespesaService>('DespesaService', ['obterPorReferencia']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    receitaService.obterPorReferencia.and.returnValue(of([]));
    despesaService.obterPorReferencia.and.returnValue(of([]));

    component = new DisponivelPageComponent(receitaService, despesaService, authService, router);
  });

  it('loads receitas and despesas for the same selected period', () => {
    component.mesAtual = new Date(2026, 4, 1);
    receitaService.obterPorReferencia.and.returnValue(of([
      { id: 'receita-1', descricao: 'Salario', valor: 3000, data: '2026-05-01' }
    ]));
    despesaService.obterPorReferencia.and.returnValue(of([
      {
        id: 'despesa-1',
        descricao: 'Mercado',
        valor: 1200,
        data: '2026-05-02',
        idContaFinanceira: 'conta-1',
        idCategoria: 'categoria-1'
      }
    ]));

    component.carregarDados();

    expect(receitaService.obterPorReferencia).toHaveBeenCalledWith(5, 2026);
    expect(despesaService.obterPorReferencia).toHaveBeenCalledWith(5, 2026);
    expect(component.calcularDisponivel()).toBe(1800);
    expect(component.mensagemCarregamento).toBe('');
  });

  it('shows empty-period and partial load-error states', () => {
    receitaService.obterPorReferencia.and.returnValue(of([]));
    despesaService.obterPorReferencia.and.returnValue(of([]));

    component.carregarDados();

    expect(component.mensagemCarregamento).toContain('Nenhum registro');

    spyOn(console, 'error');
    receitaService.obterPorReferencia.and.returnValue(throwError(() => new Error('falha')));
    despesaService.obterPorReferencia.and.returnValue(of([]));

    component.carregarDados();

    expect(component.estadoReceitas).toBe('loadError');
    expect(component.mensagemCarregamento).toContain('Não foi possível');
  });
});
