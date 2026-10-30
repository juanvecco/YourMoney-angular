import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';
import { InvestimentoService } from '../../../services/investimento';
import { ReceitaRecorrenteService } from '../../../services/receita-recorrente';
import { OpenFinanceService } from '../../../services/openfinance';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';
import { PluggyOverview, PluggyTransactionPreview } from '../../../models/pluggy.model';
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

describe('InvestimentoPageComponent Open Finance review', () => {
  let component: InvestimentoPageComponent;
  let investimentoService: jasmine.SpyObj<InvestimentoService>;
  let receitaService: jasmine.SpyObj<ReceitaRecorrenteService>;
  let openFinanceService: jasmine.SpyObj<OpenFinanceService>;
  let feedbackService: jasmine.SpyObj<import('../../../services/feedback.service').FeedbackService>;

  const transacao: PluggyTransactionPreview = {
    transactionId: 'pluggy-investment-1', connectionId: 'connection-1', accountId: 'account-1',
    institutionName: 'Banco Exemplo', accountName: 'Conta corrente',
    date: '2026-10-29T02:00:00Z', description: 'APLICACAO CDB', amount: -125.5,
    currencyCode: 'BRL', amountInAccountCurrency: null, accountCurrencyCode: 'BRL',
    direction: 'DEBIT', operationType: 'PIX', status: 'POSTED', previewOnly: true,
    registrationStatus: 'PENDING', registeredRecordType: null, registeredRecordId: null,
    possibleDuplicate: false, duplicateCandidate: null, possibleDuplicateCandidates: [],
    importable: true, suggestedAmountBrl: 125.5, importUnavailableReason: null
  };

  const overview: PluggyOverview = {
    generatedAt: '2026-10-29T12:00:00Z', sourceUpdatedAt: null,
    accounts: [{
      connectionId: 'connection-1', institutionName: 'Banco Exemplo', accountId: 'account-1',
      name: 'Conta corrente', type: 'BANK', number: null, balance: 1000, currencyCode: 'BRL', lastUpdatedAt: null
    }],
    balancesByCurrencyAndType: [], transactions: [transacao]
  };

  beforeEach(() => {
    investimentoService = jasmine.createSpyObj<InvestimentoService>('InvestimentoService', ['obterConsolidado', 'criarInvestimento', 'atualizarInvestimento', 'deletarInvestimento']);
    receitaService = jasmine.createSpyObj<ReceitaRecorrenteService>('ReceitaRecorrenteService', ['listarElegiveisParaInvestimento']);
    openFinanceService = jasmine.createSpyObj<OpenFinanceService>('OpenFinanceService', [
      'obterVisaoGeralPluggy', 'reconciliarInvestimentoPluggy',
      'obterAtivosInvestimentoPluggy', 'reconciliarAtivoInvestimentoPluggy'
    ]);
    feedbackService = jasmine.createSpyObj('FeedbackService', ['confirm', 'success', 'warning', 'error']);
    investimentoService.obterConsolidado.and.returnValue(of({ totalInvestido: 1500, itens: [], reservas: [] }));
    receitaService.listarElegiveisParaInvestimento.and.returnValue(of({ itens: [] }));
    openFinanceService.obterVisaoGeralPluggy.and.returnValue(of(overview));
    openFinanceService.reconciliarInvestimentoPluggy.and.returnValue(of({
      transactionId: transacao.transactionId, action: 'link', recordType: 'investment',
      recordId: 'investment-1', registeredAt: '2026-10-29T12:00:00Z'
    }));
    openFinanceService.obterAtivosInvestimentoPluggy.and.returnValue(of({
      generatedAt: '2026-10-30T10:00:00Z',
      connections: [{
        connectionId: 'connection-1', institutionName: 'Banco Exemplo', hasInvestmentProduct: true,
        status: 'current', lastAttemptAt: '2026-10-30T10:00:00Z', lastSuccessAt: '2026-10-30T10:00:00Z',
        nextRefreshAt: '2026-10-31T10:00:00Z', message: null, assetCount: 1
      }],
      assets: [{
        investmentId: 'asset-1', itemId: 'item-1', connectionId: 'connection-1', institutionName: 'Banco Exemplo',
        name: 'CDB Banco Exemplo', type: 'CDB', subtype: 'Prefixado', code: null, isin: null,
        balance: 120, currencyCode: 'BRL', quantity: 10, currentUnitQuote: 12, originalAmount: 100,
        positionDate: '2026-10-30T00:00:00Z', purchaseDate: null, issuer: 'Banco Exemplo', issuerCnpj: null,
        status: 'ACTIVE', sourceUpdatedAt: '2026-10-30T09:00:00Z',
        snapshotToken: '2026-10-30T10:00:00.0000000+00:00', isStale: false,
        canReconcile: true, reconcileUnavailableReason: null, linkedInvestmentId: null,
        linkedInvestmentName: null, candidates: []
      }]
    }));
    openFinanceService.reconciliarAtivoInvestimentoPluggy.and.returnValue(of({
      externalInvestmentId: 'asset-1', action: 'create', investmentId: 'investment-created', registeredAt: '2026-10-30T10:00:00Z'
    }));
    feedbackService.confirm.and.returnValue(Promise.resolve(true));
    const context = new FinancialNavigationContextService();
    context.setPeriod('2026-10');
    component = new InvestimentoPageComponent(
      investimentoService,
      receitaService,
      jasmine.createSpyObj<AuthService>('AuthService', ['logout']),
      jasmine.createSpyObj<Router>('Router', ['navigate']),
      context,
      undefined,
      feedbackService,
      openFinanceService
    );
  });

  it('loads transactions only after activation and keeps them out of portfolio totals', () => {
    expect(component.mostrarTransacoesOpenFinance).toBeFalse();
    expect(openFinanceService.obterVisaoGeralPluggy).not.toHaveBeenCalled();
    expect(component.totalInvestimentos).toBe(1500);

    component.alternarOpenFinance(true);

    expect(openFinanceService.obterVisaoGeralPluggy).toHaveBeenCalledWith({
      from: '2026-10-01', to: '2026-10-31', targetType: 'investment'
    });
    expect(component.transacoesOpenFinance).toEqual([transacao]);
    expect(component.totalInvestimentos).toBe(1500);

    component.alternarOpenFinance(false);
    expect(component.transacoesOpenFinance).toEqual([]);
    expect(component.totalInvestimentos).toBe(1500);
  });

  it('prefills available bank fields and leaves missing asset details for the user', async () => {
    await component.abrirCadastroOpenFinance(transacao);

    expect(component.novoInvestimento.nome).toBe('APLICACAO CDB');
    expect(component.novoInvestimento.descricao).toBe('APLICACAO CDB');
    expect(component.novoInvestimento.dataInvestimento).toBe('2026-10-28');
    expect(component.novoInvestimento.valorAtual).toBe(125.5);
    expect(component.novoInvestimento.tipo).toBe('');
    expect(component.novoInvestimento.quantidade).toBe(0);
    expect(component.novoInvestimento.precoMedio).toBe(0);
    expect(openFinanceService.reconciliarInvestimentoPluggy).not.toHaveBeenCalled();
  });

  it('shows distinct no-connection and missing-server-configuration states', () => {
    openFinanceService.obterVisaoGeralPluggy.and.returnValue(of({
      ...overview, accounts: [], transactions: []
    }));
    component.alternarOpenFinance(true);
    expect(component.semConexaoOpenFinance).toBeTrue();

    openFinanceService.obterVisaoGeralPluggy.and.returnValue(throwError(
      () => new HttpErrorResponse({ status: 503 })
    ));
    component.carregarTransacoesOpenFinance();
    expect(component.erroOpenFinance).toContain('não está configurado no servidor');
    expect(component.transacoesOpenFinance).toEqual([]);
  });

  it('creates the investment and source link through the review endpoint', async () => {
    await component.abrirCadastroOpenFinance(transacao);
    component.novoInvestimento = {
      ...component.novoInvestimento,
      nome: 'CDB Banco Exemplo', tipo: 'CDB', quantidade: 1,
      precoMedio: 125.5, valorAtual: 125.5
    };

    component.salvarInvestimento();

    expect(investimentoService.criarInvestimento).not.toHaveBeenCalled();
    expect(openFinanceService.reconciliarInvestimentoPluggy).toHaveBeenCalledWith(jasmine.objectContaining({
      transactionId: transacao.transactionId,
      action: 'create',
      confirmPossibleDuplicate: false,
      investment: jasmine.objectContaining({
        nome: 'CDB Banco Exemplo', tipo: 'CDB', quantidade: 1,
        precoMedio: 125.5, valorAtual: 125.5
      })
    }));
  });

  it('preserves the form and operation id when a create must be retried', async () => {
    await component.abrirCadastroOpenFinance(transacao);
    component.novoInvestimento = {
      ...component.novoInvestimento,
      nome: 'CDB Banco Exemplo', tipo: 'CDB', quantidade: 1,
      precoMedio: 125.5, valorAtual: 125.5
    };
    const operationId = component.novoInvestimento.operacaoId;
    openFinanceService.reconciliarInvestimentoPluggy.and.returnValue(throwError(
      () => new HttpErrorResponse({ status: 503, error: { message: 'Tente novamente.' } })
    ));

    component.salvarInvestimento();
    expect(component.transacaoOpenFinanceParaCadastro).toBe(transacao);
    expect(component.novoInvestimento.operacaoId).toBe(operationId);
    expect(component.erroReconciliacaoOpenFinance).toContain('Tente novamente.');

    openFinanceService.reconciliarInvestimentoPluggy.and.returnValue(of({
      transactionId: transacao.transactionId, action: 'create', recordType: 'investment',
      recordId: 'investment-new', registeredAt: '2026-10-29T12:00:00Z'
    }));
    component.salvarInvestimento();
    const requests = openFinanceService.reconciliarInvestimentoPluggy.calls.allArgs().map(([request]) => request);
    expect(requests[1].investment?.operacaoId).toBe(requests[0].investment?.operacaoId);
  });

  it('does not submit when the Open Finance form is cancelled', async () => {
    await component.abrirCadastroOpenFinance(transacao);
    component.cancelarCadastroOpenFinance();

    expect(component.transacaoOpenFinanceParaCadastro).toBeNull();
    expect(openFinanceService.reconciliarInvestimentoPluggy).not.toHaveBeenCalled();
    expect(investimentoService.criarInvestimento).not.toHaveBeenCalled();
  });

  it('asks before opening a second investment when a candidate exists', async () => {
    const candidata = {
      recordType: 'investment' as const, recordId: 'investment-1', name: 'CDB',
      description: 'Aplicação CDB', date: '2026-10-29', amount: 125.5, reason: 'Mesmo valor em centavos',
      canLink: true, canReplace: true, matchReasons: ['Mesmo valor em centavos']
    };
    const transacaoComCandidata = { ...transacao, possibleDuplicate: true, possibleDuplicateCandidates: [candidata] };
    feedbackService.confirm.and.returnValue(Promise.resolve(false));

    await component.abrirCadastroOpenFinance(transacaoComCandidata);
    expect(component.transacaoOpenFinanceParaCadastro).toBeNull();

    feedbackService.confirm.and.returnValue(Promise.resolve(true));
    await component.abrirCadastroOpenFinance(transacaoComCandidata);
    expect(component.transacaoOpenFinanceParaCadastro).toBe(transacaoComCandidata);
  });

  it('requires confirmation before linking a bank transaction to a manual investment', async () => {
    const candidata = {
      recordType: 'investment' as const, recordId: 'investment-1', name: 'CDB',
      description: 'Aplicação CDB', date: '2026-10-29', amount: 125.5, reason: 'Mesmo valor em centavos',
      canLink: true, canReplace: true, matchReasons: ['Mesmo valor em centavos']
    };

    await component.vincularTransacaoOpenFinance(transacao, candidata);

    expect(openFinanceService.reconciliarInvestimentoPluggy).toHaveBeenCalledWith(jasmine.objectContaining({
      transactionId: transacao.transactionId, action: 'link', targetInvestmentId: 'investment-1',
      expectedDescription: 'Aplicação CDB', expectedAmount: 125.5, expectedDate: '2026-10-29'
    }));
  });

  it('reviews the changed bank fields before replacing a position', async () => {
    const candidata = {
      recordType: 'investment' as const, recordId: 'investment-1', name: 'CDB',
      description: 'Aplicação CDB', date: '2026-10-29', amount: 125.5, reason: 'Mesmo valor em centavos',
      canLink: true, canReplace: true, matchReasons: ['Mesmo valor em centavos']
    };
    component.abrirSubstituicaoOpenFinance(transacao, candidata);

    await component.confirmarSubstituicaoOpenFinance();

    expect(openFinanceService.reconciliarInvestimentoPluggy).toHaveBeenCalledWith(jasmine.objectContaining({
      transactionId: transacao.transactionId, action: 'replace', targetInvestmentId: 'investment-1',
      description: transacao.description, amount: 125.5, date: '2026-10-28',
      expectedDescription: 'Aplicação CDB', expectedAmount: 125.5, expectedDate: '2026-10-29'
    }));
  });

  it('shows positions only after activation without changing the local portfolio', () => {
    expect(component.mostrarAtivosOpenFinance).toBeFalse();
    expect(openFinanceService.obterAtivosInvestimentoPluggy).not.toHaveBeenCalled();
    expect(component.totalInvestimentos).toBe(1500);

    component.alternarAtivosOpenFinance(true);

    expect(openFinanceService.obterAtivosInvestimentoPluggy).toHaveBeenCalledTimes(1);
    expect(component.ativosOpenFinanceOverview?.assets.map(item => item.name)).toEqual(['CDB Banco Exemplo']);
    expect(component.transacoesOpenFinance).toEqual([]);
    expect(component.totalInvestimentos).toBe(1500);
    component.alternarAtivosOpenFinance(false);
    expect(component.ativosOpenFinanceOverview).toBeNull();
    expect(component.totalInvestimentos).toBe(1500);
  });

  it('explains when the database migration for investment positions is pending', () => {
    openFinanceService.obterAtivosInvestimentoPluggy.and.returnValue(throwError(() =>
      new HttpErrorResponse({
        status: 503,
        error: {
          code: 'schema_migration_required',
          message: 'O banco ainda não possui a estrutura para posições de investimento Open Finance. Aplique a migration OpenFinanceInvestmentAssets e tente novamente.'
        }
      })
    ));

    component.alternarAtivosOpenFinance(true);

    expect(component.erroOpenFinance).toContain('OpenFinanceInvestmentAssets');
    expect(component.erroOpenFinance).not.toContain('Meu Pluggy ainda não está configurado');
  });

  it('explains when the local API falls back to the web page for the preview route', () => {
    openFinanceService.obterAtivosInvestimentoPluggy.and.returnValue(throwError(() =>
      new HttpErrorResponse({
        status: 200,
        statusText: 'OK',
        url: '/api/OpenFinance/investments/preview',
        error: new SyntaxError('Unexpected token < in JSON at position 0')
      })
    ));

    component.alternarAtivosOpenFinance(true);

    expect(component.erroOpenFinance).toContain('página web no lugar dos dados');
    expect(component.erroOpenFinance).toContain('Reinicie a API local atualizada');
  });

  it('explains when the API route is missing instead of treating it as an empty preview', () => {
    openFinanceService.obterAtivosInvestimentoPluggy.and.returnValue(throwError(() =>
      new HttpErrorResponse({
        status: 404,
        error: { code: 'api_route_not_found', message: 'Rota da API não encontrada.' }
      })
    ));

    component.alternarAtivosOpenFinance(true);

    expect(component.erroOpenFinance).toContain('API local');
    expect(component.erroOpenFinance?.toLowerCase()).toContain('reinicie');
  });

  it('rejects a JSON response without the typed positions overview', () => {
    openFinanceService.obterAtivosInvestimentoPluggy.and.returnValue(of({} as any));

    component.alternarAtivosOpenFinance(true);

    expect(component.erroOpenFinance).toContain('formato de dados inválido');
    expect(component.ativosOpenFinanceOverview).toBeNull();
  });

  it('distinguishes a failed first load from a failed refresh with cached positions', () => {
    expect(component.mensagemFalhaAtivosOpenFinance({ lastSuccessAt: null, message: null }))
      .toContain('ainda não há posições válidas');
    expect(component.mensagemFalhaAtivosOpenFinance({ lastSuccessAt: '2026-10-30T10:00:00Z', message: null }))
      .toContain('últimas posições válidas continuam visíveis como desatualizadas');
  });

  it('retries only the failed connection and respects its retry eligibility time', () => {
    const futureRetry = {
      connectionId: 'connection-1', institutionName: 'Banco Exemplo', hasInvestmentProduct: true,
      status: 'stale', lastAttemptAt: new Date().toISOString(), lastSuccessAt: null,
      nextRefreshAt: null, retryAfterAt: new Date(Date.now() + 60_000).toISOString(),
      message: 'Falha temporária.', assetCount: 0
    };
    const retryReady = { ...futureRetry, retryAfterAt: new Date(Date.now() - 60_000).toISOString() };
    component.mostrarAtivosOpenFinance = true;

    expect(component.podeTentarNovamenteAtivosOpenFinance(futureRetry)).toBeFalse();
    expect(component.podeTentarNovamenteAtivosOpenFinance(retryReady)).toBeTrue();
    expect(component.formatarDataHoraOpenFinance('2026-10-30T13:01:00Z')).toContain('10:01');

    component.carregarAtivosOpenFinance('connection-1', true);

    expect(openFinanceService.obterAtivosInvestimentoPluggy).toHaveBeenCalledWith('connection-1', true);
  });

  it('keeps rendering positions when their reference date is absent or invalid', () => {
    for (const date of [undefined, null, '', 'invalid-date']) {
      expect(component.formatarDataCivil(component.dataCivilOpenFinance(date))).toBe('Não informada');
    }
    expect(component.formatarDataCivil(component.dataCivilOpenFinance('2026-10-30T12:00:00Z')))
      .toBe('30/10/2026');
  });

  it('keeps successful positions from other connections after a scoped retry', () => {
    const otherAsset = {
      investmentId: 'asset-2', itemId: 'item-2', connectionId: 'connection-2', institutionName: 'Outro Banco',
      name: 'ETF Global', type: 'ETF', subtype: null, code: 'ETF1', isin: null,
      balance: 200, currencyCode: 'BRL', quantity: 2, currentUnitQuote: 100, originalAmount: 180,
      positionDate: '2026-10-30T00:00:00Z', purchaseDate: null, issuer: null, issuerCnpj: null,
      status: 'ACTIVE', sourceUpdatedAt: null, snapshotToken: 'snapshot-2', isStale: false,
      canReconcile: true, reconcileUnavailableReason: null, linkedInvestmentId: null,
      linkedInvestmentName: null, candidates: []
    };
    component.mostrarAtivosOpenFinance = true;
    component.ativosOpenFinanceOverview = {
      generatedAt: '2026-10-30T09:00:00Z',
      connections: [{
        connectionId: 'connection-2', institutionName: 'Outro Banco', hasInvestmentProduct: true,
        status: 'current', lastAttemptAt: null, lastSuccessAt: null, nextRefreshAt: null,
        retryAfterAt: null, message: null, assetCount: 1
      }],
      assets: [otherAsset]
    };

    component.carregarAtivosOpenFinance('connection-1', true);

    expect(component.ativosOpenFinanceOverview?.assets.map(asset => asset.name).sort())
      .toEqual(['CDB Banco Exemplo', 'ETF Global']);
    expect(component.ativosOpenFinanceOverview?.connections.map(connection => connection.connectionId).sort())
      .toEqual(['connection-1', 'connection-2']);
  });

  it('prefills asset registration from provider positions without mapping quote into average price', async () => {
    const asset = component.ativosOpenFinanceOverview?.assets[0] ?? {
      investmentId: 'asset-1', itemId: 'item-1', connectionId: 'connection-1', institutionName: 'Banco Exemplo',
      name: 'CDB Banco Exemplo', type: 'CDB', subtype: 'Prefixado', code: null, isin: null,
      balance: 120, currencyCode: 'BRL', quantity: 10, currentUnitQuote: 12, originalAmount: 100,
      positionDate: '2026-10-30T00:00:00Z', purchaseDate: null, issuer: 'Banco Exemplo', issuerCnpj: null,
      status: 'ACTIVE', sourceUpdatedAt: null, snapshotToken: '2026-10-30T10:00:00.0000000+00:00',
      isStale: false, canReconcile: true, reconcileUnavailableReason: null,
      linkedInvestmentId: null, linkedInvestmentName: null, candidates: []
    };
    await component.abrirCadastroAtivoOpenFinance(asset);

    expect(component.novoInvestimento.nome).toBe('CDB Banco Exemplo');
    expect(component.novoInvestimento.quantidade).toBe(10);
    expect(component.novoInvestimento.precoMedio).toBe(10);
    expect(component.novoInvestimento.precoUnitarioAtual).toBe(12);
    expect(component.novoInvestimento.valorAtual).toBe(120);

    component.novoInvestimento.dataInvestimento = '2026-10-30';
    component.salvarInvestimento();
    expect(investimentoService.criarInvestimento).not.toHaveBeenCalled();
    expect(openFinanceService.reconciliarAtivoInvestimentoPluggy).toHaveBeenCalledWith(jasmine.objectContaining({
      connectionId: 'connection-1', externalInvestmentId: 'asset-1',
      snapshotToken: asset.snapshotToken, action: 'create',
      investment: jasmine.objectContaining({
        nome: 'CDB Banco Exemplo', quantidade: 10, precoMedio: 10,
        precoUnitarioAtual: 12, valorAtual: 120
      })
    }));
  });

  it('links a position to a manual investment only after confirmation and keeps its values', async () => {
    component.alternarAtivosOpenFinance(true);
    const asset = component.ativosOpenFinanceOverview!.assets[0];
    const candidate = {
      investmentId: 'investment-manual', name: 'CDB cadastrado', type: 'CDB',
      code: 'CDBX', isin: null, reason: 'Código compatível', canReplace: true,
      cannotReplaceReason: null, valorAtual: 115
    };
    component.totalInvestimentos = 1500;

    await component.vincularAtivoOpenFinance(asset, candidate);

    expect(openFinanceService.reconciliarAtivoInvestimentoPluggy).toHaveBeenCalledWith(jasmine.objectContaining({
      connectionId: 'connection-1', externalInvestmentId: 'asset-1', action: 'link',
      targetInvestmentId: 'investment-manual', expectedLocalName: 'CDB cadastrado', expectedLocalValue: 115
    }));
    expect(investimentoService.atualizarInvestimento).not.toHaveBeenCalled();
    expect(investimentoService.criarInvestimento).not.toHaveBeenCalled();
    expect(component.totalInvestimentos).toBe(1500);
  });

  it('reviews replacement of a candidate and reconciles it without creating another investment', () => {
    component.alternarAtivosOpenFinance(true);
    const asset = component.ativosOpenFinanceOverview!.assets[0];
    const candidate = {
      investmentId: 'investment-manual', name: 'CDB cadastrado', type: 'CDB',
      code: null, isin: null, reason: 'Nome e tipo compatíveis', canReplace: true,
      cannotReplaceReason: null, quantidade: 10, precoMedio: 9.5, valorAtual: 95,
      dataInvestimento: '2026-05-01T00:00:00', mesReferencia: '2026-05-01T00:00:00',
      grupoObjetivoId: null, receitaRecorrenteId: null, tipoAtivo: null
    };

    component.abrirSubstituicaoAtivoOpenFinance(asset, candidate);
    expect(component.ativoOpenFinanceContext?.action).toBe('replace');
    expect(component.novoInvestimento.dataInvestimento).toBe('2026-05-01');
    component.salvarInvestimento();

    expect(openFinanceService.reconciliarAtivoInvestimentoPluggy).toHaveBeenCalledWith(jasmine.objectContaining({
      externalInvestmentId: 'asset-1', action: 'replace', targetInvestmentId: 'investment-manual',
      expectedLocalName: 'CDB cadastrado', expectedLocalValue: 95,
      investment: jasmine.objectContaining({ valorAtual: 120, precoUnitarioAtual: 12 })
    }));
    expect(investimentoService.criarInvestimento).not.toHaveBeenCalled();
    expect(investimentoService.atualizarInvestimento).not.toHaveBeenCalled();
  });

  it('preserves manual labels and acquisition cost while reviewing a different current balance and completing identity', () => {
    component.alternarAtivosOpenFinance(true);
    const asset = { ...component.ativosOpenFinanceOverview!.assets[0], code: 'CDB-A', isin: 'BR0000000001', purchaseDate: '2026-09-01' };
    const candidate = {
      investmentId: 'legacy', name: 'Minha reserva', descricao: 'CDB Banco Exemplo', type: 'Renda fixa',
      code: null, isin: null, reason: 'Descrição igual', canReplace: true, cannotReplaceReason: null,
      quantidade: 10, precoMedio: 9.5, valorAtual: 95, dataInvestimento: '2026-05-01',
      mesReferencia: '2026-05-01', grupoObjetivoId: 'grupo-reserva', receitaRecorrenteId: null, tipoAtivo: 'RendaFixa'
    };

    component.abrirSubstituicaoAtivoOpenFinance(asset, candidate);
    expect(component.novoInvestimento).toEqual(jasmine.objectContaining({
      id: 'legacy', nome: 'Minha reserva', descricao: 'CDB Banco Exemplo', tipo: 'Renda fixa',
      precoMedio: 9.5, valorAtual: 120, dataInvestimento: '2026-05-01', mesReferencia: '2026-05',
      codigoAtivo: 'CDB-A', isin: 'BR0000000001', grupoObjetivoId: 'grupo-reserva'
    }));
    expect(openFinanceService.reconciliarAtivoInvestimentoPluggy).not.toHaveBeenCalled();
    component.salvarInvestimento();
    expect(openFinanceService.reconciliarAtivoInvestimentoPluggy).toHaveBeenCalledWith(jasmine.objectContaining({
      action: 'replace', targetInvestmentId: 'legacy', expectedLocalValue: 95,
      investment: jasmine.objectContaining({ nome: 'Minha reserva', valorAtual: 120, precoMedio: 9.5, codigoAtivo: 'CDB-A', isin: 'BR0000000001' })
    }));
  });

  it('requires explicit acknowledgement before creating another position when a manual match is suggested', async () => {
    component.alternarAtivosOpenFinance(true);
    const asset = { ...component.ativosOpenFinanceOverview!.assets[0], candidates: [{
      investmentId: 'legacy', name: 'Minha reserva', type: 'Renda fixa', code: null, isin: null,
      reason: 'Descrição semelhante', canReplace: true, cannotReplaceReason: null, valorAtual: 95
    }] };
    feedbackService.confirm.and.returnValue(Promise.resolve(false));
    await component.abrirCadastroAtivoOpenFinance(asset);
    expect(component.ativoOpenFinanceContext).toBeNull();
    expect(openFinanceService.reconciliarAtivoInvestimentoPluggy).not.toHaveBeenCalled();

    feedbackService.confirm.and.returnValue(Promise.resolve(true));
    await component.abrirCadastroAtivoOpenFinance(asset);
    component.novoInvestimento.dataInvestimento = '2026-10-30';
    component.salvarInvestimento();
    expect(openFinanceService.reconciliarAtivoInvestimentoPluggy).toHaveBeenCalledWith(jasmine.objectContaining({
      action: 'create', confirmPossibleDuplicate: true
    }));
  });
});
