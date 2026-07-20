import { NEVER, of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { DespesasComponent } from './despesas-page';
import { ConsultaDespesasResponse, Despesa, DespesaService } from '../../../services/despesa';
import { DespesaRecorrenteService } from '../../../services/despesa-recorrente';
import { DespesaRecorrenteResponse, SugestaoDespesaRecorrenteResponse } from '../../../models/despesa-recorrente.model';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

describe('DespesasComponent', () => {
  let component: DespesasComponent;
  let despesaService: jasmine.SpyObj<DespesaService>;
  let despesaRecorrenteService: jasmine.SpyObj<DespesaRecorrenteService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const categoriasDespesa = [
    { id: 'tipo-essencial', descricao: 'Essencial', tipoTransacao: 1, categoriaPaiId: null },
    { id: 'tipo-lazer', descricao: 'Lazer', tipoTransacao: 1, categoriaPaiId: null },
    { id: 'natureza-moradia', descricao: 'Moradia', tipoTransacao: 1, categoriaPaiId: 'tipo-essencial' },
    { id: 'natureza-mercado', descricao: 'Mercado', tipoTransacao: 1, categoriaPaiId: 'tipo-essencial' },
    { id: 'natureza-passeio', descricao: 'Passeio', tipoTransacao: 1, categoriaPaiId: 'tipo-lazer' }
  ];

  function criarConsultaResponse(
    itens: Despesa[] = [],
    overrides: Partial<ConsultaDespesasResponse> = {}
  ): ConsultaDespesasResponse {
    const valorTotalFiltrado = itens.reduce(
      (total, despesa) => total + (despesa.valorLiquido ?? Math.max(despesa.valor - (despesa.valorReembolsado ?? 0), 0)),
      0
    );
    const totaisPorConta = itens.reduce((totais, despesa) => {
      totais[despesa.idContaFinanceira] = (totais[despesa.idContaFinanceira] ?? 0) +
        (despesa.valorLiquido ?? Math.max(despesa.valor - (despesa.valorReembolsado ?? 0), 0));
      return totais;
    }, {} as Record<string, number>);

    return {
      itens,
      paginaAtual: 1,
      tamanhoPagina: 10,
      totalResultados: itens.length,
      totalPaginas: itens.length > 0 ? 1 : 0,
      valorTotalFiltrado,
      totaisPorConta: Object.entries(totaisPorConta).map(([idContaFinanceira, valor]) => ({
        idContaFinanceira,
        valor
      })),
      ...overrides
    };
  }

  beforeEach(() => {
    despesaService = jasmine.createSpyObj<DespesaService>(
      'DespesaService',
      [
        'listarContas',
        'listarCategorias',
        'obterPorReferencia',
        'consultarDespesas',
        'criarDespesa',
        'criarParcelamento',
        'atualizarDespesa',
        'deletarDespesa',
        'setCategorias'
      ],
      {
        todasCategorias: categoriasDespesa
      }
    );

    despesaService.listarContas.and.returnValue(of([]));
    despesaService.listarCategorias.and.returnValue(of(categoriasDespesa));
    despesaService.obterPorReferencia.and.returnValue(of([]));
    despesaService.consultarDespesas.and.returnValue(of(criarConsultaResponse()));
    despesaService.criarDespesa.and.returnValue(of({
      id: 'despesa-1',
      descricao: 'Mercado',
      valor: 10,
      data: '2026-05-27',
      mesReferencia: '2026-05-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1'
    }));
    despesaService.criarParcelamento.and.returnValue(of({
      parcelamentoId: 'parcelamento-1',
      valorTotal: 100,
      quantidadeParcelas: 3,
      parcelas: []
    }));

    despesaRecorrenteService = jasmine.createSpyObj<DespesaRecorrenteService>(
      'DespesaRecorrenteService',
      [
        'listar',
        'obterPorId',
        'criar',
        'atualizar',
        'desativar',
        'encerrar',
        'listarSugestoes',
        'confirmarSugestao',
        'ignorarSugestao'
      ]
    );
    despesaRecorrenteService.listar.and.returnValue(of({ itens: [] }));
    despesaRecorrenteService.listarSugestoes.and.returnValue(of({ mes: 5, ano: 2026, itens: [] }));
    despesaRecorrenteService.criar.and.returnValue(of({
      id: 'recorrencia-1',
      descricao: 'Internet',
      valorPrevisto: 100,
      idContaFinanceira: 'conta-1',
      contaDescricao: 'Conta Principal',
      idTipoDespesa: 'tipo-essencial',
      tipoDescricao: 'Essencial',
      idNaturezaDespesa: 'natureza-moradia',
      naturezaDescricao: 'Moradia',
      idCategoria: 'natureza-moradia',
      categoriaDescricao: 'Moradia',
      diaVencimento: 10,
      dataInicio: '2026-05-01',
      dataTermino: null,
      ativa: true
    }));
    despesaRecorrenteService.atualizar.and.returnValue(of({
      id: 'recorrencia-1',
      descricao: 'Internet ajustada',
      valorPrevisto: 110,
      idContaFinanceira: 'conta-1',
      contaDescricao: 'Conta Principal',
      idTipoDespesa: 'tipo-essencial',
      tipoDescricao: 'Essencial',
      idNaturezaDespesa: 'natureza-moradia',
      naturezaDescricao: 'Moradia',
      idCategoria: 'natureza-moradia',
      categoriaDescricao: 'Moradia',
      diaVencimento: 12,
      dataInicio: '2026-05-01',
      dataTermino: null,
      ativa: true
    }));
    despesaRecorrenteService.desativar.and.returnValue(of(void 0));
    despesaRecorrenteService.encerrar.and.returnValue(of({
      id: 'recorrencia-1',
      descricao: 'Internet',
      valorPrevisto: 100,
      idContaFinanceira: 'conta-1',
      contaDescricao: 'Conta Principal',
      idTipoDespesa: 'tipo-essencial',
      tipoDescricao: 'Essencial',
      idNaturezaDespesa: 'natureza-moradia',
      naturezaDescricao: 'Moradia',
      idCategoria: 'natureza-moradia',
      categoriaDescricao: 'Moradia',
      diaVencimento: 10,
      dataInicio: '2026-05-01',
      dataTermino: '2026-06-30',
      ativa: true
    }));
    despesaRecorrenteService.confirmarSugestao.and.returnValue(of({
      id: 'despesa-confirmada',
      descricao: 'Internet',
      valor: 100,
      data: '2026-05-10',
      mesReferencia: '2026-05-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'natureza-moradia'
    }));
    despesaRecorrenteService.ignorarSugestao.and.returnValue(of(void 0));

    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    component = new DespesasComponent(despesaService, despesaRecorrenteService, authService, router);
  });

  function preencherFormularioValido(): void {
    component.novaDespesa = {
      id: '',
      descricao: 'Notebook',
      valor: 100,
      data: '2026-05-31',
      mesReferencia: '2026-05',
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'categoria-1',
      idNaturezaDespesa: '',
      idCategoriaEspecifica: ''
    };
  }

  function criarSugestao(overrides: Partial<SugestaoDespesaRecorrenteResponse> = {}): SugestaoDespesaRecorrenteResponse {
    return {
      ocorrenciaId: 'ocorrencia-1',
      despesaRecorrenteId: 'recorrencia-1',
      mesReferencia: '2026-05-01',
      status: 'Pendente',
      descricao: 'Internet',
      valorPrevisto: 100,
      dataSugerida: '2026-05-10',
      idContaFinanceira: 'conta-1',
      contaDescricao: 'Conta Principal',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-moradia',
      idCategoria: 'natureza-moradia',
      despesaConfirmadaId: null,
      ...overrides
    };
  }

  function criarRecorrencia(overrides: Partial<DespesaRecorrenteResponse> = {}): DespesaRecorrenteResponse {
    return {
      id: 'recorrencia-1',
      descricao: 'Internet',
      valorPrevisto: 100,
      idContaFinanceira: 'conta-1',
      contaDescricao: 'Conta Principal',
      idTipoDespesa: 'tipo-essencial',
      tipoDescricao: 'Essencial',
      idNaturezaDespesa: 'natureza-moradia',
      naturezaDescricao: 'Moradia',
      idCategoria: 'natureza-moradia',
      categoriaDescricao: 'Moradia',
      diaVencimento: 10,
      dataInicio: '2026-05-01',
      dataTermino: null,
      ativa: true,
      ...overrides
    };
  }

  it('should distribute cents exactly across installment preview', () => {
    const preview = component.calcularParcelasPreview(100, 3, '2026-05-26');

    expect(preview.map(parcela => parcela.valor)).toEqual([33.34, 33.33, 33.33]);
    expect(preview.reduce((total, parcela) => total + parcela.valor, 0)).toBeCloseTo(100, 2);
  });

  it('should clamp end-of-month dates for generated installments', () => {
    const preview = component.calcularParcelasPreview(90, 3, '2026-01-31');

    expect(preview.map(parcela => parcela.data)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31'
    ]);
  });

  it('should switch to parcelada mode and generate preview', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;
    component.quantidadeParcelas = 3;

    component.atualizarPreviewParcelamento();

    expect(component.parcelasPreview.length).toBe(3);
    expect(component.parcelasPreview[0].numeroParcela).toBe(1);
    expect(component.parcelasPreview[2].totalParcelas).toBe(3);
  });

  it('should reject invalid installment quantities', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;

    component.quantidadeParcelas = 0;
    expect(component.parcelamentoValido()).toBeFalse();

    component.quantidadeParcelas = 121;
    expect(component.parcelamentoValido()).toBeFalse();
  });

  it('should reject zero or negative total values in parcelada mode', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;
    component.quantidadeParcelas = 3;

    component.novaDespesa.valor = 0;
    expect(component.parcelamentoValido()).toBeFalse();

    component.novaDespesa.valor = -1;
    expect(component.parcelamentoValido()).toBeFalse();
  });

  it('should call criarParcelamento for valid parcelada expenses', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;
    component.quantidadeParcelas = 3;
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);
    (globalThis as typeof globalThis & { bootstrap?: unknown }).bootstrap = {
      Modal: {
        getInstance: () => ({ hide: () => undefined })
      }
    };

    component.salvarDespesa();

    expect(despesaService.criarParcelamento).toHaveBeenCalledWith({
      descricao: 'Notebook',
      valorTotal: 100,
      dataInicial: '2026-05-31',
      mesReferenciaInicial: '2026-05-01',
      quantidadeParcelas: 3,
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1'
    });
    expect(despesaService.criarDespesa).not.toHaveBeenCalled();
  });

  it('saves a simple expense, reloads the selected period and updates saving state', () => {
    preencherFormularioValido();
    component.mesAtual = new Date(2026, 4, 1);
    despesaService.criarDespesa.and.returnValue(of({
      id: 'despesa-criada',
      descricao: 'Notebook',
      valor: 100,
      data: '2026-05-31',
      mesReferencia: '2026-05-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1'
    }));
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);
    (globalThis as typeof globalThis & { bootstrap?: unknown }).bootstrap = {
      Modal: {
        getInstance: () => ({ hide: () => undefined })
      }
    };

    component.salvarDespesa();

    expect(despesaService.criarDespesa).toHaveBeenCalledWith({
      descricao: 'Notebook',
      valor: 100,
      data: '2026-05-31',
      mesReferencia: '2026-05-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1'
    });
    expect(component.salvandoDespesa).toBeFalse();
    expect(despesaService.consultarDespesas).toHaveBeenCalledWith(jasmine.objectContaining({
      mes: 5,
      ano: 2026,
      pagina: 1,
      tamanhoPagina: 10
    }));
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
      icon: 'success',
      title: 'Cadastrada!'
    }));
  });

  it('keeps form data and shows backend message when simple expense save fails', () => {
    preencherFormularioValido();
    despesaService.criarDespesa.and.returnValue(throwError(() => ({
      error: { message: 'Conta Financeira não encontrada.' }
    })));
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);

    component.salvarDespesa();

    expect(component.novaDespesa.descricao).toBe('Notebook');
    expect(component.salvandoDespesa).toBeFalse();
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
      icon: 'error',
      title: 'Erro ao salvar despesa!',
      text: 'Conta Financeira não encontrada.'
    }));
  });

  it('blocks repeated simple expense saves while request is in progress', () => {
    preencherFormularioValido();
    despesaService.criarDespesa.and.returnValue(NEVER);

    component.salvarDespesa();
    component.salvarDespesa();

    expect(component.salvandoDespesa).toBeTrue();
    expect(despesaService.criarDespesa).toHaveBeenCalledTimes(1);
  });

  it('should keep data and show error when parcelamento save fails', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;
    component.quantidadeParcelas = 3;
    component.atualizarPreviewParcelamento();
    despesaService.criarParcelamento.and.returnValue(throwError(() => new Error('fail')));
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);

    component.salvarDespesa();

    expect(component.novaDespesa.descricao).toBe('Notebook');
    expect(component.parcelasPreview.length).toBe(3);
    expect(component.salvandoParcelamento).toBeFalse();
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
      icon: 'error',
      title: 'Erro ao salvar parcelamento!'
    }));
  });

  it('should render installment labels only for installment expenses', () => {
    expect(component.temParcelamento({
      id: 'despesa-1',
      descricao: 'Notebook',
      valor: 100,
      data: '2026-06-01',
      mesReferencia: '2026-06-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1',
      parcelamentoId: 'parcelamento-1',
      numeroParcela: 2,
      totalParcelas: 6,
      valorTotalParcelamento: 600
    })).toBeTrue();

    expect(component.obterRotuloParcela({
      id: 'despesa-1',
      descricao: 'Notebook',
      valor: 100,
      data: '2026-06-01',
      mesReferencia: '2026-06-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1',
      parcelamentoId: 'parcelamento-1',
      numeroParcela: 2,
      totalParcelas: 6,
      valorTotalParcelamento: 600
    })).toBe('Parcela 2/6');

    expect(component.temParcelamento({
      id: 'despesa-2',
      descricao: 'Mercado',
      valor: 50,
      data: '2026-06-01',
      mesReferencia: '2026-06-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1'
    })).toBeFalse();
  });

  it('loads despesas by selected month and updates total', () => {
    component.mesAtual = new Date(2026, 4, 1);
    const despesas: Despesa[] = [
      {
        id: 'despesa-1',
        descricao: 'Mercado',
        valor: 120,
        data: '2026-05-10',
        mesReferencia: '2026-05-01',
        idContaFinanceira: 'conta-1',
        idCategoria: 'categoria-1'
      },
      {
        id: 'despesa-2',
        descricao: 'Internet',
        valor: 80,
        data: '2026-05-05',
        mesReferencia: '2026-05-01',
        idContaFinanceira: 'conta-1',
        idCategoria: 'categoria-1'
      }
    ];
    despesaService.consultarDespesas.and.returnValue(of(criarConsultaResponse(despesas, {
      totalResultados: 2,
      totalPaginas: 1,
      valorTotalFiltrado: 200
    })));

    component.carregarDespesas();

    expect(despesaService.consultarDespesas).toHaveBeenCalledWith({
      mes: 5,
      ano: 2026,
      idContaFinanceira: undefined,
      idTipoDespesa: undefined,
      idNaturezaDespesa: undefined,
      pagina: 1,
      tamanhoPagina: 10
    });
    expect(component.despesas).toEqual(despesas);
    expect(component.totalDespesas).toBe(200);
    expect(component.totalDespesasFiltradas).toBe(200);
    expect(component.totalResultadosDespesas).toBe(2);
    expect(component.estadoCarregamento).toBe('loadedWithData');
  });

  it('calculates liquid expense values when reimbursements are present', () => {
    component.mesAtual = new Date(2026, 4, 1);
    despesaService.consultarDespesas.and.returnValue(of(criarConsultaResponse([
      {
        id: 'despesa-1',
        descricao: 'Compra para terceiro',
        valor: 150,
        valorReembolsado: 50,
        valorLiquido: 100,
        possuiReembolso: true,
        data: '2026-05-10',
        mesReferencia: '2026-05-01',
        idContaFinanceira: 'conta-1',
        idCategoria: 'categoria-1'
      },
      {
        id: 'despesa-2',
        descricao: 'Internet',
        valor: 80,
        data: '2026-05-05',
        mesReferencia: '2026-05-01',
        idContaFinanceira: 'conta-1',
        idCategoria: 'categoria-1'
      }
    ], {
      totalResultados: 2,
      totalPaginas: 1,
      valorTotalFiltrado: 180
    })));

    component.carregarDespesas();

    expect(component.obterValorLiquidoDespesa(component.despesas[0])).toBe(100);
    expect(component.obterValorLiquidoDespesa(component.despesas[1])).toBe(80);
    expect(component.totalDespesas).toBe(180);
    expect(component.totalDespesasFiltradas).toBe(180);
  });

  it('shows empty-period and load-error states for despesas', () => {
    component.mesAtual = new Date(2026, 5, 1);
    component.filtrosTransacoes.idContaFinanceira = 'conta-1';
    despesaService.consultarDespesas.and.returnValue(of(criarConsultaResponse([], {
      totalResultados: 0,
      totalPaginas: 0,
      valorTotalFiltrado: 0
    })));

    component.carregarDespesas();

    expect(component.estadoCarregamento).toBe('emptyPeriod');
    expect(component.mensagemCarregamento).toContain('Nenhum registro');
    expect(component.totalDespesasFiltradas).toBe(0);
    expect(component.filtrosTransacoes.idContaFinanceira).toBe('conta-1');
    expect(component.paginasVisiveis()).toEqual([]);

    spyOn(console, 'error');
    despesaService.consultarDespesas.and.returnValue(throwError(() => new Error('falha')));

    component.carregarDespesas();

    expect(component.estadoCarregamento).toBe('loadError');
    expect(component.mensagemCarregamento).toContain('Não foi possível');
    expect(component.totalDespesasFiltradas).toBe(0);
    expect(component.filtrosTransacoes.idContaFinanceira).toBe('conta-1');
  });

  it('falls back to legacy reference endpoint when consulta endpoint is unavailable', () => {
    component.mesAtual = new Date(2026, 4, 1);
    component.filtrosTransacoes = {
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-mercado'
    };
    despesaService.consultarDespesas.and.returnValue(throwError(() => ({ status: 404 })));
    despesaService.obterPorReferencia.and.returnValue(of([
      {
        id: 'despesa-mercado',
        descricao: 'Mercado',
        valor: 120,
        data: '2026-05-10',
        mesReferencia: '2026-05-01',
        idContaFinanceira: 'conta-1',
        idCategoria: 'natureza-mercado'
      },
      {
        id: 'despesa-cinema',
        descricao: 'Cinema',
        valor: 80,
        data: '2026-05-06',
        mesReferencia: '2026-05-01',
        idContaFinanceira: 'conta-2',
        idCategoria: 'natureza-passeio'
      }
    ]));
    spyOn(console, 'error');

    component.carregarDespesas();

    expect(despesaService.consultarDespesas).toHaveBeenCalled();
    expect(despesaService.obterPorReferencia).toHaveBeenCalledWith(5, 2026);
    expect(component.estadoCarregamento).toBe('loadedWithData');
    expect(component.despesas.map(despesa => despesa.id)).toEqual(['despesa-mercado']);
    expect(component.totalResultadosDespesas).toBe(1);
    expect(component.totalDespesasFiltradas).toBe(120);
  });

  it('reloads listed despesas and totalizer when transaction filters change', () => {
    component.mesAtual = new Date(2026, 4, 1);
    const despesaFiltrada: Despesa = {
      id: 'despesa-mercado',
      descricao: 'Mercado',
      valor: 120,
      data: '2026-05-10',
      mesReferencia: '2026-05-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'natureza-mercado'
    };
    despesaService.consultarDespesas.and.returnValue(of(criarConsultaResponse([despesaFiltrada], {
      totalResultados: 1,
      totalPaginas: 1,
      valorTotalFiltrado: 120
    })));

    component.paginaAtual = 3;
    component.filtrosTransacoes = {
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-mercado'
    };

    component.aplicarFiltrosTransacoes();

    expect(despesaService.consultarDespesas).toHaveBeenCalledWith({
      mes: 5,
      ano: 2026,
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-mercado',
      pagina: 1,
      tamanhoPagina: 10
    });
    expect(component.paginaAtual).toBe(1);
    expect(component.despesas).toEqual([despesaFiltrada]);
    expect(component.totalDespesasFiltradas).toBe(120);
    expect(component.temFiltrosTransacoesAtivos()).toBeTrue();
  });

  it('updates nature filters when transaction type changes and clears nature selection', () => {
    component.filtrosTransacoes = {
      idContaFinanceira: '',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-passeio'
    };

    component.onFiltroTipoChange();

    expect(component.naturezasFiltroDespesa.map(categoria => categoria.id)).toEqual([
      'natureza-moradia',
      'natureza-mercado'
    ]);
    expect(component.filtrosTransacoes.idNaturezaDespesa).toBe('');
    expect(despesaService.consultarDespesas).toHaveBeenCalledWith(jasmine.objectContaining({
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: undefined,
      pagina: 1
    }));
  });

  it('navigates pages without changing the filtered totalizer', () => {
    component.mesAtual = new Date(2026, 4, 1);
    component.contas = [{ id: 'conta-1', descricao: 'Conta Principal' }];
    const paginaUm: Despesa = {
      id: 'despesa-page-1',
      descricao: 'Aluguel',
      valor: 1000,
      data: '2026-05-01',
      mesReferencia: '2026-05-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'natureza-moradia'
    };
    const paginaDois: Despesa = {
      id: 'despesa-page-2',
      descricao: 'Internet',
      valor: 90,
      data: '2026-05-02',
      mesReferencia: '2026-05-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'natureza-moradia'
    };
    despesaService.consultarDespesas.and.returnValues(
      of(criarConsultaResponse([paginaUm], {
        paginaAtual: 1,
        totalResultados: 12,
        totalPaginas: 2,
        valorTotalFiltrado: 1500,
        totaisPorConta: [
          { idContaFinanceira: 'conta-1', valor: 1500 }
        ]
      })),
      of(criarConsultaResponse([paginaDois], {
        paginaAtual: 2,
        totalResultados: 12,
        totalPaginas: 2,
        valorTotalFiltrado: 1500,
        totaisPorConta: [
          { idContaFinanceira: 'conta-1', valor: 1500 }
        ]
      }))
    );

    component.carregarDespesas();
    component.irParaPagina(2);
    component.irParaPagina(3);

    expect(despesaService.consultarDespesas.calls.count()).toBe(2);
    expect(despesaService.consultarDespesas.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      pagina: 2,
      tamanhoPagina: 10
    }));
    expect(component.despesas).toEqual([paginaDois]);
    expect(component.totalDespesasFiltradas).toBe(1500);
    expect(component.totalPorConta).toEqual([
      { descricao: 'Conta Principal', valor: 1500 }
    ]);
    expect(component.paginasVisiveis()).toEqual([1, 2]);
  });

  it('clears transaction filters and reloads the default consulta context', () => {
    component.filtrosTransacoes = {
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-moradia'
    };
    component.naturezasFiltroDespesa = [categoriasDespesa[2]];

    component.limparFiltrosTransacoes();

    expect(component.filtrosTransacoes).toEqual({
      idContaFinanceira: '',
      idTipoDespesa: '',
      idNaturezaDespesa: ''
    });
    expect(component.naturezasFiltroDespesa).toEqual([]);
    expect(despesaService.consultarDespesas).toHaveBeenCalledWith(jasmine.objectContaining({
      idContaFinanceira: undefined,
      idTipoDespesa: undefined,
      idNaturezaDespesa: undefined,
      pagina: 1
    }));
  });

  it('loads recurring suggestions for the selected month', () => {
    const sugestao = criarSugestao();
    component.mesAtual = new Date(2026, 4, 1);
    despesaRecorrenteService.listarSugestoes.and.returnValue(of({
      mes: 5,
      ano: 2026,
      itens: [sugestao]
    }));

    component.carregarSugestoesRecorrentes();

    expect(despesaRecorrenteService.listarSugestoes).toHaveBeenCalledWith(5, 2026);
    expect(component.sugestoesRecorrentes).toEqual([sugestao]);
    expect(component.temSugestoesPendentes()).toBeTrue();
    expect(component.obterTotalSugestoesPendentes()).toBe(100);
  });

  it('confirms recurring suggestion without overrides and reloads month data', () => {
    const sugestao = criarSugestao();
    component.mesAtual = new Date(2026, 4, 1);
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);

    component.confirmarSugestao(sugestao);

    expect(despesaRecorrenteService.confirmarSugestao).toHaveBeenCalledWith('ocorrencia-1', {});
    expect(component.salvandoSugestaoRecorrente).toBeFalse();
    expect(despesaRecorrenteService.listarSugestoes).toHaveBeenCalledWith(5, 2026);
    expect(despesaService.consultarDespesas).toHaveBeenCalledWith(jasmine.objectContaining({
      mes: 5,
      ano: 2026
    }));
  });

  it('confirms recurring suggestion with edited fields', () => {
    const sugestao = criarSugestao();

    component.editarSugestao(sugestao);
    component.confirmacaoSugestao = {
      ...component.confirmacaoSugestao,
      descricao: 'Internet ajustada',
      valor: 110,
      data: '2026-05-12',
      idContaFinanceira: 'conta-2',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-moradia',
      idCategoriaEspecifica: ''
    };
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);

    component.confirmarSugestao(sugestao);

    expect(despesaRecorrenteService.confirmarSugestao).toHaveBeenCalledWith('ocorrencia-1', {
      descricao: 'Internet ajustada',
      valor: 110,
      data: '2026-05-12',
      idContaFinanceira: 'conta-2',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-moradia',
      idCategoria: 'natureza-moradia'
    });
    expect(component.sugestaoEmEdicaoId).toBe('');
  });

  it('creates recurring expense configuration with monthly base data', () => {
    component.novaRecorrencia = {
      descricao: 'Internet',
      valorPrevisto: 100,
      dataVencimento: '2026-05-10',
      dataInicio: '2026-05-01',
      dataTermino: '',
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-moradia',
      idCategoriaEspecifica: ''
    };
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);
    (window as any).bootstrap = {
      Modal: {
        getInstance: () => ({ hide: () => undefined })
      }
    };

    component.salvarRecorrencia();

    expect(despesaRecorrenteService.criar).toHaveBeenCalledWith({
      descricao: 'Internet',
      valorPrevisto: 100,
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-moradia',
      idCategoria: 'natureza-moradia',
      dataVencimento: '2026-05-10',
      dataInicio: '2026-05-01',
      dataTermino: null
    });
    expect(component.salvandoRecorrencia).toBeFalse();
    expect(despesaRecorrenteService.listar).toHaveBeenCalled();
    expect(despesaRecorrenteService.listarSugestoes).toHaveBeenCalled();
  });

  it('updates recurring expense configuration when editing', () => {
    component.recorrenciaEditandoId = 'recorrencia-1';
    component.novaRecorrencia = {
      descricao: 'Internet ajustada',
      valorPrevisto: 110,
      dataVencimento: '2026-05-12',
      dataInicio: '2026-05-01',
      dataTermino: '',
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-moradia',
      idCategoriaEspecifica: ''
    };
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);
    (window as any).bootstrap = {
      Modal: {
        getInstance: () => ({ hide: () => undefined })
      }
    };

    component.salvarRecorrencia();

    expect(despesaRecorrenteService.atualizar).toHaveBeenCalledWith('recorrencia-1', jasmine.objectContaining({
      descricao: 'Internet ajustada',
      valorPrevisto: 110,
      dataVencimento: '2026-05-12'
    }));
    expect(despesaRecorrenteService.criar).not.toHaveBeenCalled();
  });

  it('deactivates recurring expense after confirmation', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);

    component.desativarRecorrencia(criarRecorrencia());
    await Promise.resolve();
    await Promise.resolve();

    expect(despesaRecorrenteService.desativar).toHaveBeenCalledWith('recorrencia-1');
    expect(despesaRecorrenteService.listar).toHaveBeenCalled();
    expect(despesaRecorrenteService.listarSugestoes).toHaveBeenCalled();
  });

  it('ends recurring expense with selected end date', async () => {
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({
      isConfirmed: true,
      value: '2026-06-30'
    }) as any);

    component.encerrarRecorrencia(criarRecorrencia());
    await Promise.resolve();
    await Promise.resolve();

    expect(despesaRecorrenteService.encerrar).toHaveBeenCalledWith('recorrencia-1', {
      dataTermino: '2026-06-30'
    });
    expect(despesaRecorrenteService.listar).toHaveBeenCalled();
    expect(despesaRecorrenteService.listarSugestoes).toHaveBeenCalled();
  });

  it('reloads recurring suggestions when navigating months', () => {
    component.mesAtual = new Date(2026, 4, 1);
    despesaRecorrenteService.listarSugestoes.calls.reset();

    component.mudarMes(1);

    expect(component.mesAtual.getMonth()).toBe(5);
    expect(despesaRecorrenteService.listarSugestoes).toHaveBeenCalledWith(6, 2026);
  });
});
