import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { InvestimentoPageComponent } from './investimento-page';
import { InvestimentoService } from '../../../services/investimento';
import { AuthService } from '../../../services/auth.service';

describe('InvestimentoPageComponent', () => {
  let component: InvestimentoPageComponent;
  let investimentoService: jasmine.SpyObj<InvestimentoService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    investimentoService = jasmine.createSpyObj<InvestimentoService>('InvestimentoService', [
      'obterPorReferencia',
      'criarInvestimento',
      'atualizarInvestimento',
      'deletarInvestimento'
    ]);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    investimentoService.obterPorReferencia.and.returnValue(of([]));

    component = new InvestimentoPageComponent(investimentoService, authService, router);
  });

  it('loads investimentos by selected month and updates total', () => {
    component.mesAtual = new Date(2026, 4, 1);
    investimentoService.obterPorReferencia.and.returnValue(of([
      {
        id: 'investimento-1',
        nome: 'Tesouro',
        descricao: 'Tesouro direto',
        tipo: 'Renda fixa',
        quantidade: 1,
        precoMedio: 1000,
        valorAtual: 1500,
        dataInvestimento: new Date('2026-05-02'),
        dataResgate: new Date('2026-12-02'),
        ativo: true
      }
    ]));

    component.carregarInvestimentos();

    expect(investimentoService.obterPorReferencia).toHaveBeenCalledWith(5, 2026);
    expect(component.totalInvestimentos).toBe(1500);
    expect(component.estadoCarregamento).toBe('loadedWithData');
  });

  it('shows empty-period and load-error states for investimentos', () => {
    investimentoService.obterPorReferencia.and.returnValue(of([]));

    component.carregarInvestimentos();

    expect(component.estadoCarregamento).toBe('emptyPeriod');
    expect(component.mensagemCarregamento).toContain('Nenhum registro');

    spyOn(console, 'error');
    investimentoService.obterPorReferencia.and.returnValue(throwError(() => new Error('falha')));

    component.carregarInvestimentos();

    expect(component.estadoCarregamento).toBe('loadError');
    expect(component.totalInvestimentos).toBe(0);
    expect(component.mensagemCarregamento).toContain('Não foi possível');
  });
});
