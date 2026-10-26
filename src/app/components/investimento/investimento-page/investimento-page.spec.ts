import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';
import { InvestimentoService } from '../../../services/investimento';
import { ReceitaRecorrenteService } from '../../../services/receita-recorrente';
import { InvestimentoPageComponent } from './investimento-page';

/* Monthly navigation tests retained here only as historical context; the page is consolidated now.
const legacyMonthlyInvestimentoPageTests = () => {
  let component: InvestimentoPageComponent;
  let investimentoService: jasmine.SpyObj<InvestimentoService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let receitaRecorrenteService: jasmine.SpyObj<ReceitaRecorrenteService>;
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
    mesReferencia: '2026-04-01T00:00:00',
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
    receitaRecorrenteService = jasmine.createSpyObj<ReceitaRecorrenteService>('ReceitaRecorrenteService', ['listarElegiveisParaInvestimento']);
    receitaRecorrenteService.listarElegiveisParaInvestimento.and.returnValue(of({ itens: [] }));
    investimentoService.obterPorReferencia.and.returnValue(of([]));
    fireSpy = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as never);

    component = new InvestimentoPageComponent(investimentoService, receitaRecorrenteService, authService, router);
  });

  it('loads investimentos by selected month and updates total', () => {
    component.mesAtual = new Date(2026, 4, 1);
    investimentoService.obterPorReferencia.and.returnValue(of([createdInvestment]));

    component.carregarInvestimentos();

    expect(investimentoService.obterPorReferencia).toHaveBeenCalledWith(5, 2026);
    expect(component.totalInvestimentos).toBe(1500);
    expect(component.estadoCarregamento).toBe('loadedWithData');
  });

  it('combines new and legacy monthly investments without duplicating totals', () => {
    const legacy = {
      ...createdInvestment,
      id: 'legacy-1',
      valorAtual: 500,
      dataInvestimento: '2026-05-15T00:00:00',
      mesReferencia: null
    };
    investimentoService.obterPorReferencia.and.returnValue(of([legacy, createdInvestment]));

    component.carregarInvestimentos();

    expect(component.investimentos.map(item => item.id)).toEqual(['legacy-1', 'investimento-1']);
    expect(component.totalInvestimentos).toBe(2000);
  });

  it('creates one investment and reloads its reference month', () => {
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
      mesReferencia: '2026-04',
      dataResgate: null,
      ativo: true
      , receitaRecorrenteId: null
      , operacaoId: 'operacao-1'
    };

    component.salvarInvestimento();

    expect(investimentoService.criarInvestimento).toHaveBeenCalledWith({
      nome: 'Tesouro',
      descricao: '',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 1000,
      valorAtual: 1500,
      dataInvestimento: '2026-05-02',
      mesReferencia: '2026-04-01',
      receitaRecorrenteId: null,
      operacaoId: 'operacao-1'
    });
    expect(component.mesAtual.getFullYear()).toBe(2026);
    expect(component.mesAtual.getMonth()).toBe(3);
    expect(investimentoService.obterPorReferencia).toHaveBeenCalledWith(4, 2026);
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
    expect(component.mesAtual.getMonth()).toBe(3);
  });

  it('rejects a missing reference month without sending a request', () => {
    component.novoInvestimento = {
      ...component.novoInvestimento,
      nome: 'Tesouro',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 100,
      valorAtual: 100,
      mesReferencia: ''
    };

    component.salvarInvestimento();

    expect(investimentoService.criarInvestimento).not.toHaveBeenCalled();
    expect(fireSpy.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      text: 'Informe o mês de referência.'
    }));
  });

  it('uses the civil date month when opening a legacy investment for editing', () => {
    component.abrirModalEditar({ ...createdInvestment, mesReferencia: null });

    expect(component.novoInvestimento.mesReferencia).toBe('2026-05');
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
};
*/

describe('InvestimentoPageComponent consolidated view', () => {
  let component: InvestimentoPageComponent;
  let investimentoService: jasmine.SpyObj<InvestimentoService>;
  let receitaService: jasmine.SpyObj<ReceitaRecorrenteService>;
  let fireSpy: jasmine.Spy;

  const investimento = {
    id: 'investimento-1', nome: 'Tesouro', descricao: 'Reserva', tipo: 'Renda fixa', quantidade: 1,
    precoMedio: 1000, valorAtual: 1500, dataInvestimento: '2026-05-02T00:00:00',
    mesReferencia: '2026-04-01T00:00:00', dataResgate: null, ativo: true,
    receitaRecorrenteId: null, reservaAssociada: null
  };

  beforeEach(() => {
    investimentoService = jasmine.createSpyObj<InvestimentoService>('InvestimentoService', [
      'obterConsolidado', 'criarInvestimento', 'atualizarInvestimento', 'deletarInvestimento'
    ]);
    receitaService = jasmine.createSpyObj<ReceitaRecorrenteService>('ReceitaRecorrenteService', ['listarElegiveisParaInvestimento']);
    investimentoService.obterConsolidado.and.returnValue(of({ totalInvestido: 1500, itens: [investimento], reservas: [] }));
    receitaService.listarElegiveisParaInvestimento.and.returnValue(of({ itens: [] }));
    fireSpy = spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as never);
    component = new InvestimentoPageComponent(
      investimentoService,
      receitaService,
      jasmine.createSpyObj<AuthService>('AuthService', ['logout']),
      jasmine.createSpyObj<Router>('Router', ['navigate'])
    );
  });

  it('loads the authoritative consolidated total without a month', () => {
    expect(investimentoService.obterConsolidado).toHaveBeenCalled();
    expect(component.totalInvestimentos).toBe(1500);
    expect(component.investimentos).toEqual([investimento]);
    expect(component.estadoCarregamento).toBe('loadedWithData');
  });

  it('uses empty and error states from consolidated loading', () => {
    investimentoService.obterConsolidado.and.returnValue(of({ totalInvestido: 0, itens: [], reservas: [] }));
    component.carregarInvestimentos();
    expect(component.estadoCarregamento).toBe('emptyPeriod');

    spyOn(console, 'error');
    investimentoService.obterConsolidado.and.returnValue(throwError(() => new Error('falha')));
    component.carregarInvestimentos();
    expect(component.estadoCarregamento).toBe('loadError');
  });

  it('keeps one operation id across a failed retry and blocks double submit', () => {
    component.abrirModalInvestimento();
    component.novoInvestimento = {
      ...component.novoInvestimento,
      nome: 'Tesouro', descricao: 'Reserva', tipo: 'Renda fixa', quantidade: 1, precoMedio: 100, valorAtual: 100
    };
    const operationId = component.novoInvestimento.operacaoId;
    investimentoService.criarInvestimento.and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 503 })),
      of(investimento)
    );
    component.salvarInvestimento();
    component.salvarInvestimento();
    expect(investimentoService.criarInvestimento.calls.allArgs().map(args => args[0].operacaoId)).toEqual([operationId, operationId]);
    expect(fireSpy).toHaveBeenCalled();
  });

  it('shows actual percentages but caps only progress width', () => {
    expect(component.formatarPercentual(125.5)).toContain('125,50');
    expect(component.larguraProgresso(125.5)).toBe(100);
  });

  it('uses authoritative filtered totals and ignores out-of-order responses', () => {
    const older = new Subject<any>();
    const newer = new Subject<any>();
    investimentoService.obterConsolidado.and.returnValues(older, newer);
    const ordered = new InvestimentoPageComponent(
      investimentoService,
      receitaService,
      jasmine.createSpyObj<AuthService>('AuthService', ['logout']),
      jasmine.createSpyObj<Router>('Router', ['navigate'])
    );
    ordered.filtroGrupo = 'semGrupo';
    ordered.carregarInvestimentos();
    newer.next({ totalInvestido: 1000, totalFiltrado: 100, itens: [investimento], reservas: [], subtotaisPorGrupo: [], subtotaisPorTipoAtivo: [] });
    newer.complete();
    older.next({ totalInvestido: 999, totalFiltrado: 999, itens: [], reservas: [] });
    older.complete();
    expect(ordered.totalInvestimentos).toBe(1000);
    expect(ordered.totalFiltrado).toBe(100);
    expect(ordered.investimentos.length).toBe(1);
  });

  it('distributes objective percentages in tenths that add up to exactly one hundred percent', () => {
    investimentoService.obterConsolidado.and.returnValue(of({
      totalInvestido: 3,
      totalFiltrado: 3,
      itens: [investimento],
      reservas: [],
      subtotaisPorGrupo: [
        { grupoObjetivoId: 'g1', nome: 'Reserva', quantidadeInvestimentos: 1, valorAtual: 1 },
        { grupoObjetivoId: 'g2', nome: 'Renda', quantidadeInvestimentos: 1, valorAtual: 1 },
        { grupoObjetivoId: null, nome: 'Sem grupo', quantidadeInvestimentos: 1, valorAtual: 1 }
      ]
    }));

    component.carregarInvestimentos();

    expect(component.subtotaisPorGrupo.map(subtotal => subtotal.percentual)).toEqual([33.4, 33.3, 33.3]);
    expect(component.subtotaisPorGrupo.reduce((total, subtotal) => total + (subtotal.percentual ?? 0), 0)).toBeCloseTo(100, 10);
  });

  it('uses zero percent when objective values have no positive total', () => {
    investimentoService.obterConsolidado.and.returnValue(of({
      totalInvestido: 0,
      totalFiltrado: 0,
      itens: [],
      reservas: [],
      subtotaisPorGrupo: [
        { grupoObjetivoId: null, nome: 'Sem grupo', quantidadeInvestimentos: 0, valorAtual: 0 }
      ]
    }));

    component.carregarInvestimentos();

    expect(component.subtotaisPorGrupo[0].percentual).toBe(0);
  });

  it('maps stable labels and explicit null organization', () => {
    expect(component.rotuloTipoAtivo('FundoInvestimento')).toBe('Fundo de investimento');
    expect(component.rotuloTipoAtivo(null)).toBe('Não classificado');
    component.abrirModalInvestimento();
    component.novoInvestimento = {
      ...component.novoInvestimento, nome: 'ETF', descricao: 'Exterior', tipo: 'IVVB11',
      quantidade: 1, precoMedio: 100, valorAtual: 100, grupoObjetivoId: null, tipoAtivo: null
    };
    investimentoService.criarInvestimento.and.returnValue(of(investimento));
    component.salvarInvestimento();
    expect(investimentoService.criarInvestimento).toHaveBeenCalledWith(jasmine.objectContaining({
      tipo: 'IVVB11', grupoObjetivoId: null, tipoAtivo: null, receitaRecorrenteId: null
    }));
  });
});
