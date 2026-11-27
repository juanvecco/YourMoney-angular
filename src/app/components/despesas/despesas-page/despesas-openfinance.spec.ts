import { of, Subject, throwError } from 'rxjs';
import { DespesasComponent } from './despesas-page';
import { DespesaService } from '../../../services/despesa';
import { DespesaRecorrenteService } from '../../../services/despesa-recorrente';
import { AuthService } from '../../../services/auth.service';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';
import { OpenFinanceService } from '../../../services/openfinance';
import { PluggyOverview, PluggyTransactionPreview } from '../../../models/pluggy.model';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

describe('DespesasComponent Open Finance panel', () => {
  let component: DespesasComponent;
  let openFinance: jasmine.SpyObj<OpenFinanceService>;
  let router: jasmine.SpyObj<Router>;

  function transacao(overrides: Partial<PluggyTransactionPreview> = {}): PluggyTransactionPreview {
    return {
      transactionId: 'source-1',
      connectionId: 'connection-1',
      accountId: 'pluggy-account-1',
      institutionName: 'Banco Exemplo',
      accountName: 'Conta corrente',
      category: null,
      date: '2026-05-12T00:00:00-03:00',
      description: 'Mercado',
      amount: 42.5,
      currencyCode: 'BRL',
      amountInAccountCurrency: null,
      accountCurrencyCode: 'BRL',
      direction: 'DEBIT',
      operationType: 'PIX',
      classification: 'EXPENSE',
      classificationReason: 'CONSUMPTION',
      status: 'POSTED',
      previewOnly: true,
      registrationStatus: 'PENDING',
      registeredRecordType: null,
      registeredRecordId: null,
      possibleDuplicate: false,
      duplicateCandidate: null,
      possibleDuplicateCandidates: [],
      importable: true,
      importUnavailableReason: null,
      ...overrides
    };
  }

  beforeEach(() => {
    openFinance = jasmine.createSpyObj<OpenFinanceService>(
      'OpenFinanceService',
      ['obterVisaoGeralPluggy', 'reconciliarDespesaPluggy']
    );
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    component = new DespesasComponent(
      {} as DespesaService,
      {} as DespesaRecorrenteService,
      {} as AuthService,
      router,
      new FinancialNavigationContextService(),
      openFinance
    );
    component.mesAtual = new Date(2026, 4, 1);
    component.totalDespesas = 625;
    component.totalDespesasFiltradas = 240;
    component.totalResultadosDespesas = 7;
  });

  it('loads the selected month only after the switch is enabled and does not change local totals', () => {
    const debit = transacao();
    const credit = transacao({ transactionId: 'source-credit', direction: 'CREDIT', classification: 'EXCLUDED', classificationReason: 'NON_CONSUMPTION' });
    openFinance.obterVisaoGeralPluggy.and.returnValue(of({
      transactions: [debit, credit]
    } as PluggyOverview));

    expect(openFinance.obterVisaoGeralPluggy).not.toHaveBeenCalled();
    component.alternarOpenFinance(true);

    expect(openFinance.obterVisaoGeralPluggy).toHaveBeenCalledWith({ from: '2026-05-01', to: '2026-05-31' });
    expect(component.transacoesOpenFinance).toEqual([debit]);
    expect(component.totalDespesas).toBe(625);
    expect(component.totalDespesasFiltradas).toBe(240);
    expect(component.totalResultadosDespesas).toBe(7);
  });

  it('separates eligible expenses from investments, excluded transactions and uncertain items', () => {
    const expense = transacao();
    const investment = transacao({ transactionId: 'source-investment', classification: 'INVESTMENT', classificationReason: 'INVESTMENT_APPLICATION' });
    const excluded = transacao({ transactionId: 'source-excluded', classification: 'EXCLUDED', classificationReason: 'CARD_BILL_PAYMENT' });
    const review = transacao({
      transactionId: 'source-review',
      classification: 'REVIEW',
      classificationReason: 'AMBIGUOUS',
      possibleDuplicateCandidates: [
        { recordType: 'expense', recordId: 'expense-review', description: 'Compra manual', date: '2026-05-12', amount: 42.5, reason: 'Mesmo valor' }
      ]
    });
    openFinance.obterVisaoGeralPluggy.and.returnValue(of({ transactions: [expense, investment, excluded, review] } as PluggyOverview));

    component.alternarOpenFinance(true);

    expect(component.transacoesOpenFinance).toEqual([expense]);
    expect(component.transacoesOpenFinanceEmRevisao).toEqual([review]);
    expect(component.candidatosDespesa(component.transacoesOpenFinanceEmRevisao[0]).map(candidate => candidate.recordId))
      .toEqual(['expense-review']);
    expect(component.isTransacaoImportavel(review)).toBeFalse();
    expect(component.totalDespesas).toBe(625);
  });

  it('ignores an outstanding source response after the switch is turned off', () => {
    const response = new Subject<PluggyOverview>();
    openFinance.obterVisaoGeralPluggy.and.returnValue(response.asObservable());

    component.alternarOpenFinance(true);
    component.alternarOpenFinance(false);
    response.next({ transactions: [transacao()] } as PluggyOverview);

    expect(component.transacoesOpenFinance).toEqual([]);
    expect(component.carregandoOpenFinance).toBeFalse();
    expect(component.mostrarOpenFinance).toBeFalse();
  });

  it('shows a recoverable source error without clearing local totals', () => {
    openFinance.obterVisaoGeralPluggy.and.returnValue(throwError(() => ({ status: 502 })));

    component.alternarOpenFinance(true);

    expect(component.erroOpenFinance).toContain('indisponível');
    expect(component.totalDespesas).toBe(625);
    expect(component.totalDespesasFiltradas).toBe(240);
  });

  it('explains when the server has no Meu Pluggy configuration and links to Open Finance', () => {
    openFinance.obterVisaoGeralPluggy.and.returnValue(throwError(() => ({ status: 503 })));

    component.alternarOpenFinance(true);

    expect(component.openFinanceConfiguracaoPendente).toBeTrue();
    expect(component.erroOpenFinance).toContain('não está configurado no servidor');
    component.abrirOpenFinance();
    expect(router.navigate).toHaveBeenCalledWith(['/openfinance']);
  });

  it('shows the no-connection state separately from a connected account with no monthly expenses', () => {
    openFinance.obterVisaoGeralPluggy.and.returnValue(of({
      accounts: [],
      transactions: []
    } as unknown as PluggyOverview));

    component.alternarOpenFinance(true);

    expect(component.contasOpenFinanceDisponiveis).toBe(0);
    expect(component.transacoesOpenFinance).toEqual([]);
  });

  it('keeps only expense candidates for explicit review', () => {
    const transaction = transacao({
      possibleDuplicateCandidates: [
        { recordType: 'expense', recordId: 'expense-1', description: 'Mercado', date: '2026-05-12', amount: 42.5, reason: 'Mesmo valor' },
        { recordType: 'revenue', recordId: 'revenue-1', description: 'Entrada', date: '2026-05-12', amount: 42.5, reason: 'Outra direção' }
      ]
    });

    expect(component.candidatosDespesa(transaction).map(candidate => candidate.recordId)).toEqual(['expense-1']);
  });

  it('prefills an editable local expense form without saving the source', () => {
    const transaction = transacao();
    spyOn<any>(component, 'abrirModal');

    component.abrirCadastroOpenFinance(transaction);

    expect(component.novaDespesa.descricao).toBe('Mercado');
    expect(component.novaDespesa.valor).toBe(42.5);
    expect(component.novaDespesa.data).toBe('2026-05-12');
    expect(component.transacaoOpenFinanceEmRevisao?.transactionId).toBe('source-1');
    expect(openFinance.reconciliarDespesaPluggy).not.toHaveBeenCalled();
  });

  it('prefills a unique matching expense category and the unique C6 Bank account', () => {
    const categories = [
      { id: 'essenciais', descricao: 'Essenciais', tipoTransacao: 1, categoriaPaiId: null },
      { id: 'alimentacao', descricao: 'Alimentação', tipoTransacao: 1, categoriaPaiId: 'essenciais' },
      { id: 'mercado', descricao: 'Mercado', tipoTransacao: 1, categoriaPaiId: 'alimentacao' }
    ];
    (component as any).despesaService = { todasCategorias: categories };
    component.tiposDespesa = [categories[0] as any];
    component.contas = [{ id: 'conta-c6', descricao: 'C6 Bank' }];
    spyOn<any>(component, 'abrirModal');

    component.abrirCadastroOpenFinance(transacao({
      category: 'Supermarket',
      institutionName: 'C6 Bank'
    }));

    expect(component.novaDespesa.idCategoriaEspecifica).toBe('mercado');
    expect(component.novaDespesa.idContaFinanceira).toBe('conta-c6');
    expect(component.usarNovaCategoriaOpenFinance).toBeFalse();
  });

  it('keeps an unmatched provider category editable without creating it before save', () => {
    const categories = [
      { id: 'essenciais', descricao: 'Essenciais', tipoTransacao: 1, categoriaPaiId: null },
      { id: 'alimentacao', descricao: 'Alimentação', tipoTransacao: 1, categoriaPaiId: 'essenciais' }
    ];
    (component as any).despesaService = { todasCategorias: categories };
    component.tiposDespesa = [categories[0] as any];
    spyOn<any>(component, 'abrirModal');

    component.abrirCadastroOpenFinance(transacao({ category: 'Pharmacy' }));

    expect(component.usarNovaCategoriaOpenFinance).toBeTrue();
    expect(component.categoriaOpenFinanceNovaDescricao).toBe('Pharmacy');
    expect(component.categoriaOpenFinanceNovaParentId).toBe('essenciais');
    expect(openFinance.reconciliarDespesaPluggy).not.toHaveBeenCalled();
  });

  it('does not pick an arbitrary category or account when matches are ambiguous', () => {
    const categories = [
      { id: 'essenciais', descricao: 'Essenciais', tipoTransacao: 1, categoriaPaiId: null },
      { id: 'alimentacao', descricao: 'Alimentação', tipoTransacao: 1, categoriaPaiId: 'essenciais' },
      { id: 'mercado-1', descricao: 'Mercado', tipoTransacao: 1, categoriaPaiId: 'alimentacao' },
      { id: 'nao-essenciais', descricao: 'Não essenciais', tipoTransacao: 1, categoriaPaiId: null },
      { id: 'compras', descricao: 'Compras', tipoTransacao: 1, categoriaPaiId: 'nao-essenciais' },
      { id: 'mercado-2', descricao: 'Supermercado', tipoTransacao: 1, categoriaPaiId: 'compras' }
    ];
    (component as any).despesaService = { todasCategorias: categories };
    component.tiposDespesa = [categories[0] as any, categories[3] as any];
    component.contas = [
      { id: 'conta-c6-1', descricao: 'C6 Bank' },
      { id: 'conta-c6-2', descricao: 'C6 Bank' }
    ];
    spyOn<any>(component, 'abrirModal');

    component.abrirCadastroOpenFinance(transacao({
      category: 'Supermarket',
      institutionName: 'C6 Bank'
    }));

    expect(component.novaDespesa.idTipoDespesa).toBe('');
    expect(component.novaDespesa.idNaturezaDespesa).toBe('');
    expect(component.novaDespesa.idCategoriaEspecifica).toBe('');
    expect(component.usarNovaCategoriaOpenFinance).toBeFalse();
    expect(component.novaDespesa.idContaFinanceira).toBe('');
  });

  it('does not select the C6 account from a merchant description alone', () => {
    component.contas = [{ id: 'conta-c6', descricao: 'C6 Bank' }];
    spyOn<any>(component, 'abrirModal');

    component.abrirCadastroOpenFinance(transacao({
      description: 'Compra na loja C6 Bank',
      institutionName: 'Banco Exemplo',
      accountName: 'Conta corrente'
    }));

    expect(component.novaDespesa.idContaFinanceira).toBe('');
  });

  it('maps common provider category labels to one existing category', () => {
    const categories = [
      { id: 'essenciais', descricao: 'Essenciais', tipoTransacao: 1, categoriaPaiId: null },
      { id: 'alimentacao', descricao: 'Alimentação', tipoTransacao: 1, categoriaPaiId: 'essenciais' },
      { id: 'mercado', descricao: 'Mercado', tipoTransacao: 1, categoriaPaiId: 'alimentacao' },
      { id: 'compras', descricao: 'Compras', tipoTransacao: 1, categoriaPaiId: 'essenciais' },
      { id: 'farmacia', descricao: 'Farmácia', tipoTransacao: 1, categoriaPaiId: 'essenciais' },
      { id: 'servicos', descricao: 'Serviços', tipoTransacao: 1, categoriaPaiId: 'essenciais' },
      { id: 'vestuario', descricao: 'Vestuário', tipoTransacao: 1, categoriaPaiId: 'essenciais' },
      { id: 'transporte', descricao: 'Transporte', tipoTransacao: 1, categoriaPaiId: 'essenciais' }
    ];
    (component as any).despesaService = { todasCategorias: categories };
    component.tiposDespesa = [categories[0] as any];
    spyOn<any>(component, 'abrirModal');

    const cases = [
      ['Supermarket', 'mercado'],
      ['SHoPPing', 'compras'],
      ['Pharmacy', 'farmacia'],
      ['FARMACIA', 'farmacia'],
      ['SERVICES', 'servicos'],
      ['Clothing', 'vestuario'],
      ['Vestuarios', 'vestuario'],
      ['Transportation', 'transporte']
    ];

    for (const [category, expectedId] of cases) {
      component.abrirCadastroOpenFinance(transacao({ category }));
      expect(component.novaDespesa.idCategoriaEspecifica || component.novaDespesa.idNaturezaDespesa)
        .withContext(`provider category ${category}`)
        .toBe(expectedId);
    }
  });

  it('sends a new category name and parent only when confirming the expense', () => {
    component.transacaoOpenFinanceEmRevisao = transacao({ category: 'Pharmacy' });
    component.usarNovaCategoriaOpenFinance = true;
    component.categoriaOpenFinanceNovaDescricao = 'Farmácia';
    component.categoriaOpenFinanceNovaParentId = 'essenciais';
    component.novaDespesa = {
      id: '', descricao: 'Drogaria', valor: 35.9, data: '2026-05-12', mesReferencia: '2026-05',
      idContaFinanceira: 'conta-c6', idTipoDespesa: '', idNaturezaDespesa: '', idCategoriaEspecifica: ''
    };
    openFinance.reconciliarDespesaPluggy.and.returnValue(of({
      transactionId: 'source-1', action: 'create', recordType: 'expense',
      recordId: 'expense-new', idCategoria: 'category-new', registeredAt: '2026-05-12T12:00:00Z'
    } as any));
    spyOn<any>(component, 'fecharModal');
    spyOn<any>(component, 'mostrarSucesso');
    spyOn(component, 'carregarDespesas');
    const refreshCategories = spyOn(component, 'carregarCategoriasCompletas');
    spyOn<any>(component, 'verificarBadgeOrganizador');

    component.salvarDespesa();

    expect(openFinance.reconciliarDespesaPluggy).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      transactionId: 'source-1', action: 'create', idContaFinanceira: 'conta-c6',
      newCategoryDescription: 'Farmácia', newCategoryParentId: 'essenciais'
    }));
    expect('idCategoria' in openFinance.reconciliarDespesaPluggy.calls.mostRecent().args[0]).toBeFalse();
    expect(refreshCategories).toHaveBeenCalled();
  });

  it('does not submit a new category until its name and parent are provided', () => {
    component.transacaoOpenFinanceEmRevisao = transacao();
    component.usarNovaCategoriaOpenFinance = true;
    component.categoriaOpenFinanceNovaDescricao = '';
    component.categoriaOpenFinanceNovaParentId = '';
    component.novaDespesa = {
      id: '', descricao: 'Drogaria', valor: 35.9, data: '2026-05-12', mesReferencia: '2026-05',
      idContaFinanceira: 'conta-c6', idTipoDespesa: '', idNaturezaDespesa: '', idCategoriaEspecifica: ''
    };
    spyOn(Swal, 'fire');

    component.salvarDespesa();

    expect(openFinance.reconciliarDespesaPluggy).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'Campos obrigatórios!',
      text: jasmine.stringMatching(/nome da categoria/i)
    }));
  });

  it('requires an explicit expense choice before opening a form for uncertain nature', async () => {
    const review = transacao({ classification: 'REVIEW', classificationReason: 'AMBIGUOUS' });
    spyOn<any>(component, 'abrirModal');

    component.abrirCadastroOpenFinance(review);
    expect(component.transacaoOpenFinanceEmRevisao).toBeNull();

    await component.confirmarCadastroSeparadoOpenFinance(review, 'expense');

    expect(component.transacaoOpenFinanceEmRevisao?.transactionId).toBe('source-1');
    expect(component.classificacaoManualOpenFinance).toBe('expense');
    expect(openFinance.reconciliarDespesaPluggy).not.toHaveBeenCalled();
  });

  it('blocks form prefill when the source has no safe BRL value', () => {
    const transaction = transacao({
      currencyCode: 'USD',
      accountCurrencyCode: 'USD',
      amount: 10,
      amountInAccountCurrency: null,
      importable: false,
      importUnavailableReason: 'Sem valor BRL seguro'
    });
    spyOn<any>(component, 'abrirModal');

    component.abrirCadastroOpenFinance(transaction);

    expect(component.transacaoOpenFinanceEmRevisao).toBeNull();
    expect(component.novaDespesa.valor).toBe(0);
    expect((component as any).abrirModal).not.toHaveBeenCalled();
  });

  it('shows a pending debit for review and requires an explicit expense decision', () => {
    const pending = transacao({
      status: 'PENDING', classification: 'REVIEW', classificationReason: 'PENDING_STATUS'
    });
    openFinance.obterVisaoGeralPluggy.and.returnValue(of({ transactions: [pending] } as PluggyOverview));

    component.alternarOpenFinance(true);

    expect(component.transacoesOpenFinance).toEqual([]);
    expect(component.transacoesOpenFinanceEmRevisao).toEqual([pending]);
    expect(component.isTransacaoImportavel(pending)).toBeFalse();
    expect(component.podeCadastrarOpenFinance(pending)).toBeFalse();
    expect(component.podeRevisarComoDespesa(pending)).toBeTrue();
    expect(component.podeCadastrarOpenFinance(pending, 'expense')).toBeTrue();
    expect(component.mensagemRevisaoClassificacaoOpenFinance(pending)).toContain('valor e data podem mudar');
  });

  it('uses the Brazilian civil date when the provider timestamp is UTC', () => {
    const transaction = transacao({ date: '2026-05-13T02:00:00Z' });
    spyOn<any>(component, 'abrirModal');

    component.abrirCadastroOpenFinance(transaction);

    expect(component.novaDespesa.data).toBe('2026-05-12');
  });

  it('links a reviewed candidate without requesting a local expense update', async () => {
    const transaction = transacao();
    const candidate = {
      recordType: 'expense' as const,
      recordId: 'expense-1',
      description: 'Mercado',
      date: '2026-05-12',
      amount: 42.5,
      reason: 'Mesmo valor em centavos',
      canLink: true,
      canReplace: true
    };
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
    const reconcile = spyOn<any>(component, 'executarReconciliacao');

    await component.vincularDespesaOpenFinance(transaction, candidate);

    expect(reconcile).toHaveBeenCalledOnceWith({
      transactionId: 'source-1',
      action: 'link',
      targetExpenseId: 'expense-1',
      expectedDescription: 'Mercado',
      expectedDate: '2026-05-12',
      expectedAmount: 42.5
    }, false);
  });

  it('lets an explicitly reviewed expense candidate be kept and linked', async () => {
    const transaction = transacao({ status: 'PENDING', classification: 'REVIEW', classificationReason: 'PENDING_STATUS' });
    const candidate = {
      recordType: 'expense' as const,
      recordId: 'expense-1',
      description: 'Compra manual',
      date: '2026-05-12',
      amount: 42.5,
      reason: 'Mesmo valor em centavos',
      canLink: true,
      canReplace: true
    };
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
    const reconcile = spyOn<any>(component, 'executarReconciliacao');

    await component.vincularDespesaOpenFinance(transaction, candidate, 'expense');

    expect(reconcile).toHaveBeenCalledOnceWith({
      transactionId: 'source-1',
      action: 'link',
      reviewedClassification: 'expense',
      targetExpenseId: 'expense-1',
      expectedDescription: 'Compra manual',
      expectedDate: '2026-05-12',
      expectedAmount: 42.5
    }, false);
  });

  it('requests a confirmed replacement with the origin values', async () => {
    const transaction = transacao({ description: 'Mercearia Central', amount: 42.5 });
    const candidate = {
      recordType: 'expense' as const,
      recordId: 'expense-2',
      description: 'Compra manual',
      date: '2026-05-11',
      amount: 42.5,
      reason: 'Mesmo valor; data com um dia de diferença',
      canLink: true,
      canReplace: true
    };
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
    const reconcile = spyOn<any>(component, 'executarReconciliacao');

    await component.substituirDespesaOpenFinance(transaction, candidate);

    expect(reconcile).toHaveBeenCalledOnceWith({
      transactionId: 'source-1',
      action: 'replace',
      targetExpenseId: 'expense-2',
      expectedDescription: 'Compra manual',
      expectedDate: '2026-05-11',
      expectedAmount: 42.5,
      description: 'Mercearia Central',
      date: '2026-05-12',
      amount: 42.5
    }, true);
  });

  it('requires explicit expense review when replacing a manual candidate from the review queue', async () => {
    const transaction = transacao({
      description: 'Shopee *Tucan 1/2',
      status: 'PENDING',
      classification: 'REVIEW',
      classificationReason: 'PENDING_STATUS'
    });
    const candidate = {
      recordType: 'expense' as const,
      recordId: 'expense-3',
      description: 'Shopee Tucan',
      date: '2026-05-12',
      amount: 42.5,
      reason: 'Mesmo valor em centavos',
      canLink: true,
      canReplace: true
    };
    const confirmation = spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
    const reconcile = spyOn<any>(component, 'executarReconciliacao');

    await component.substituirDespesaOpenFinance(transaction, candidate, 'expense');

    expect(confirmation).toHaveBeenCalledWith(jasmine.objectContaining({
      title: 'Confirmar substituição da despesa',
      customClass: { popup: 'ym-openfinance-replace-popup' },
      confirmButtonText: 'Substituir despesa',
      html: jasmine.stringContaining('você classifica esta transação como despesa')
    }));
    const modalHtml = (confirmation.calls.mostRecent().args[0] as unknown as { html: string }).html;
    expect(modalHtml).toContain('<h3>Descrição</h3>');
    expect(modalHtml).toContain('<span>Atual</span>');
    expect(modalHtml).toContain('<span>Open Finance</span>');
    expect(modalHtml).toContain('A transação ainda está pendente no banco');
    expect(reconcile).toHaveBeenCalledOnceWith({
      transactionId: 'source-1',
      action: 'replace',
      reviewedClassification: 'expense',
      targetExpenseId: 'expense-3',
      expectedDescription: 'Shopee Tucan',
      expectedDate: '2026-05-12',
      expectedAmount: 42.5,
      description: 'Shopee *Tucan 1/2',
      date: '2026-05-12',
      amount: 42.5
    }, true);
  });

  it('saves a prefilled expense through the atomic reconciliation request', () => {
    const transaction = transacao();
    component.transacaoOpenFinanceEmRevisao = transaction;
    component.novaDespesa = {
      id: '',
      descricao: 'Mercado revisado',
      valor: 43.25,
      data: '2026-05-12',
      mesReferencia: '2026-05',
      idContaFinanceira: 'local-account-1',
      idTipoDespesa: 'local-category-1',
      idNaturezaDespesa: '',
      idCategoriaEspecifica: ''
    };
    openFinance.reconciliarDespesaPluggy.and.returnValue(of({
      transactionId: 'source-1',
      action: 'create',
      recordType: 'expense',
      recordId: 'expense-new',
      registeredAt: '2026-05-12T12:00:00Z'
    } as any));
    spyOn<any>(component, 'fecharModal');
    spyOn<any>(component, 'mostrarSucesso');
    spyOn(component, 'carregarDespesas');
    spyOn<any>(component, 'verificarBadgeOrganizador');

    component.salvarDespesa();

    expect(openFinance.reconciliarDespesaPluggy).toHaveBeenCalledOnceWith({
      transactionId: 'source-1',
      action: 'create',
      description: 'Mercado revisado',
      amount: 43.25,
      date: '2026-05-12',
      idContaFinanceira: 'local-account-1',
      idCategoria: 'local-category-1',
      confirmPossibleDuplicate: false
    });
    expect(component.salvandoDespesa).toBeFalse();
  });

  it('sends the explicit review decision with the confirmed expense', () => {
    const transaction = transacao({ status: 'PENDING', classification: 'REVIEW', classificationReason: 'PENDING_STATUS' });
    component.transacaoOpenFinanceEmRevisao = transaction;
    component.classificacaoManualOpenFinance = 'expense';
    component.novaDespesa = {
      id: '', descricao: 'Compra revisada', valor: 43.25, data: '2026-05-12', mesReferencia: '2026-05',
      idContaFinanceira: 'local-account-1', idTipoDespesa: 'local-category-1', idNaturezaDespesa: '', idCategoriaEspecifica: ''
    };
    openFinance.reconciliarDespesaPluggy.and.returnValue(of({} as any));
    spyOn<any>(component, 'fecharModal');
    spyOn<any>(component, 'mostrarSucesso');
    spyOn(component, 'carregarDespesas');
    spyOn<any>(component, 'verificarBadgeOrganizador');

    component.salvarDespesa();

    expect(openFinance.reconciliarDespesaPluggy).toHaveBeenCalledWith(jasmine.objectContaining({
      transactionId: 'source-1', action: 'create', reviewedClassification: 'expense'
    }));
  });

  it('requires an explicit create-separately confirmation when a candidate exists', async () => {
    const transaction = transacao({
      possibleDuplicate: true,
      possibleDuplicateCandidates: [
        { recordType: 'expense', recordId: 'expense-1', description: 'Compra manual', date: '2026-05-12', amount: 42.5, reason: 'Mesmo valor' }
      ]
    });
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
    spyOn<any>(component, 'abrirModal');

    await component.confirmarCadastroSeparadoOpenFinance(transaction);

    expect(component.transacaoOpenFinanceEmRevisao?.transactionId).toBe('source-1');
    expect(component.confirmouPossivelDuplicidadeOpenFinance).toBeTrue();
    expect(openFinance.reconciliarDespesaPluggy).not.toHaveBeenCalled();
  });

  it('does not request a write when the person cancels replacement review', async () => {
    const transaction = transacao();
    const candidate = {
      recordType: 'expense' as const,
      recordId: 'expense-1',
      description: 'Mercado',
      date: '2026-05-12',
      amount: 42.5,
      reason: 'Mesmo valor em centavos',
      canLink: true,
      canReplace: true
    };
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: false } as any);
    const reconcile = spyOn<any>(component, 'executarReconciliacao');

    await component.substituirDespesaOpenFinance(transaction, candidate);

    expect(reconcile).not.toHaveBeenCalled();
  });
});
