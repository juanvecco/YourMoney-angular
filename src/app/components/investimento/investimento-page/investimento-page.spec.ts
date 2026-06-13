import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';
import { InvestimentoService } from '../../../services/investimento';
import { InvestimentoPageComponent } from './investimento-page';

describe('InvestimentoPageComponent', () => {
  let component: InvestimentoPageComponent;
  let investimentoService: jasmine.SpyObj<InvestimentoService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let fireSpy: jasmine.Spy;

  const createdInvestment = {
    id: 'investimento-1',
    nome: 'Tesouro',
    descricao: '',
    tipo: 'Renda fixa',
    quantidade: 1,
    precoMedio: 1000,
    valorAtual: 1500,
    dataInvestimento: '2026-05-02T00:00:00',
    dataResgate: null,
    ativo: true
  };

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
    fireSpy = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as never);

    component = new InvestimentoPageComponent(investimentoService, authService, router);
  });

  it('loads investimentos by selected month and updates total', () => {
    component.mesAtual = new Date(2026, 4, 1);
    investimentoService.obterPorReferencia.and.returnValue(of([createdInvestment]));

    component.carregarInvestimentos();

    expect(investimentoService.obterPorReferencia).toHaveBeenCalledWith(5, 2026);
    expect(component.totalInvestimentos).toBe(1500);
    expect(component.estadoCarregamento).toBe('loadedWithData');
  });

  it('creates one investment and reloads the month from its civil date', () => {
    investimentoService.criarInvestimento.and.returnValue(of(createdInvestment));
    component.novoInvestimento = {
      id: '',
      nome: ' Tesouro ',
      descricao: '',
      tipo: ' Renda fixa ',
      quantidade: 1,
      precoMedio: 1000,
      valorAtual: 1500,
      dataInvestimento: '2026-05-02',
      dataResgate: null,
      ativo: true
    };

    component.salvarInvestimento();

    expect(investimentoService.criarInvestimento).toHaveBeenCalledWith({
      nome: 'Tesouro',
      descricao: '',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 1000,
      valorAtual: 1500,
      dataInvestimento: '2026-05-02'
    });
    expect(component.mesAtual.getFullYear()).toBe(2026);
    expect(component.mesAtual.getMonth()).toBe(4);
    expect(investimentoService.obterPorReferencia).toHaveBeenCalledWith(5, 2026);
    expect(component.salvandoInvestimento).toBeFalse();
  });

  it('blocks repeated submits while the create request is pending', () => {
    const pending = new Subject<typeof createdInvestment>();
    investimentoService.criarInvestimento.and.returnValue(pending);
    component.novoInvestimento = {
      ...component.novoInvestimento,
      nome: 'Tesouro',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 100,
      valorAtual: 100
    };

    component.salvarInvestimento();
    component.salvarInvestimento();

    expect(component.salvandoInvestimento).toBeTrue();
    expect(investimentoService.criarInvestimento).toHaveBeenCalledTimes(1);
    pending.next(createdInvestment);
    pending.complete();
    expect(component.salvandoInvestimento).toBeFalse();
  });

  it('rejects invalid local data without sending a request', () => {
    component.novoInvestimento.nome = ' ';

    component.salvarInvestimento();

    expect(investimentoService.criarInvestimento).not.toHaveBeenCalled();
    expect(fireSpy).toHaveBeenCalled();
  });

  it('preserves form data and shows validation messages returned by the API', () => {
    investimentoService.criarInvestimento.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { errors: { Quantidade: ['Quantidade deve ser maior que zero.'] } }
    })));
    component.novoInvestimento = {
      ...component.novoInvestimento,
      nome: 'Tesouro',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 100,
      valorAtual: 100
    };

    component.salvarInvestimento();

    expect(component.novoInvestimento.nome).toBe('Tesouro');
    expect(fireSpy.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      text: 'Quantidade deve ser maior que zero.'
    }));
  });

  it('classifies authentication, authorization, unavailable and unexpected failures', () => {
    component.novoInvestimento = {
      ...component.novoInvestimento,
      nome: 'Tesouro',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 100,
      valorAtual: 100
    };

    const cases = [
      { status: 401, expected: 'Sessão expirada' },
      { status: 403, expected: 'não tem permissão' },
      { status: 503, expected: 'temporariamente indisponível' },
      { status: 500, expected: 'Não foi possível salvar' }
    ];

    for (const testCase of cases) {
      investimentoService.criarInvestimento.and.returnValue(throwError(() => new HttpErrorResponse({
        status: testCase.status
      })));
      component.salvarInvestimento();
      expect(fireSpy.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
        text: jasmine.stringMatching(testCase.expected)
      }));
      expect(component.salvandoInvestimento).toBeFalse();
    }
  });

  it('allows a successful retry after a failed request without duplicating the create call', () => {
    investimentoService.criarInvestimento.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 503 })),
      of(createdInvestment)
    );
    component.novoInvestimento = {
      ...component.novoInvestimento,
      nome: 'Tesouro',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 100,
      valorAtual: 100
    };

    component.salvarInvestimento();
    component.salvarInvestimento();

    expect(investimentoService.criarInvestimento).toHaveBeenCalledTimes(2);
    expect(component.mesAtual.getMonth()).toBe(4);
  });

  it('shows empty-period and load-error states for investimentos', () => {
    component.carregarInvestimentos();
    expect(component.estadoCarregamento).toBe('emptyPeriod');

    spyOn(console, 'error');
    investimentoService.obterPorReferencia.and.returnValue(throwError(() => new Error('falha')));
    component.carregarInvestimentos();

    expect(component.estadoCarregamento).toBe('loadError');
    expect(component.totalInvestimentos).toBe(0);
  });
});
