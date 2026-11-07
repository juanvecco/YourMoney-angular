import { of, Subject, throwError } from 'rxjs';
import { OpenFinancePageComponent } from './openfinance-page';
import { OpenFinanceService } from '../../../services/openfinance';
import { CarteiraService } from '../../../services/carteira';
import { ContaFinanceiraService } from '../../../services/conta';
import { Carteira } from '../../../models/carteira.model';
import {
  OpenFinanceSourcesResponse,
  OpenFinanceTransactionPreviewResponse
} from '../../../models/openfinance.model';

describe('OpenFinancePageComponent', () => {
  let component: OpenFinancePageComponent;
  let openFinanceService: jasmine.SpyObj<OpenFinanceService>;
  let carteiraService: jasmine.SpyObj<CarteiraService>;
  let contaFinanceiraService: jasmine.SpyObj<ContaFinanceiraService>;
  const carteira: Carteira = { id: 'wallet-1', nome: 'Minha carteira', principal: true };

  const sourcesResponse: OpenFinanceSourcesResponse = {
    readiness: {
      mode: 'preview-only',
      realDataEnabled: false,
      summary: 'Somente preview',
      nextSteps: ['Consentimento futuro']
    },
    sources: [
      {
        id: 'mock-transactions',
        name: 'Mock',
        type: 'simulated',
        status: 'available',
        message: 'Disponivel',
        supportsTransactionPreview: true
      },
      {
        id: 'real-openfinance',
        name: 'Real',
        type: 'future-consent',
        status: 'not-configured',
        message: 'Futuro',
        supportsTransactionPreview: false
      }
    ]
  };

  const previewResponse: OpenFinanceTransactionPreviewResponse = {
    sourceId: 'mock-transactions',
    mode: 'preview-only',
    items: [
      {
        id: 'mock-001',
        sourceId: 'mock-transactions',
        transactionDate: '2026-06-05',
        description: 'Salario',
        amount: 5000,
        direction: 'inflow',
        suggestedFinancialType: 'receita',
        duplicateRisk: false,
        importStatus: 'preview-only'
      },
      {
        id: 'mock-002',
        sourceId: 'mock-transactions',
        transactionDate: '2026-06-06',
        description: 'Supermercado',
        amount: 248.75,
        direction: 'outflow',
        suggestedFinancialType: 'despesa',
        duplicateRisk: true,
        duplicateReason: 'Possivel duplicidade',
        importStatus: 'preview-only'
      }
    ]
  };

  beforeEach(() => {
    openFinanceService = jasmine.createSpyObj<OpenFinanceService>('OpenFinanceService', [
      'obterFontes',
      'obterPreviewTransacoes',
      'verificarProvedor',
      'obterConfiguracaoCredenciaisPluggy',
      'salvarConfiguracaoCredenciaisPluggy',
      'obterConexoes',
      'obterConnectToken',
      'obterContasPluggy',
      'obterVisaoGeralPluggy',
      'removerConexao',
      'registrarConexao',
      'importarTransacaoPluggy'
    ]);
    carteiraService = jasmine.createSpyObj<CarteiraService>('CarteiraService', ['listar', 'criar', 'renomear', 'remover']);
    carteiraService.listar.and.returnValue(of([carteira]));
    contaFinanceiraService = jasmine.createSpyObj<ContaFinanceiraService>('ContaFinanceiraService', [
      'listarContas', 'criarConta', 'moverConta', 'listarInstituicoesBancarias', 'atualizarConta', 'removerConta',
    ]);
    contaFinanceiraService.listarContas.and.returnValue(of([]));
    openFinanceService.obterFontes.and.returnValue(of(sourcesResponse));
    openFinanceService.obterPreviewTransacoes.and.returnValue(of(previewResponse));
    openFinanceService.verificarProvedor.and.returnValue(of({ accessToken: 'temporary', expiresAt: '2026-10-27T15:00:00Z' }));
    openFinanceService.obterConfiguracaoCredenciaisPluggy.and.returnValue(of({
      configured: false,
      source: 'none',
      clientIdHint: null,
      updatedAt: null,
      canSave: true,
    }));
    openFinanceService.salvarConfiguracaoCredenciaisPluggy.and.returnValue(of({
      configured: true,
      source: 'database',
      clientIdHint: 'abcd…wxyz',
      updatedAt: '2026-10-28T20:00:00Z',
      canSave: true,
    }));
    openFinanceService.obterConexoes.and.returnValue(of([]));
    openFinanceService.obterConnectToken.and.returnValue(of({ accessToken: 'temporary', expiresAt: '2026-10-27T15:00:00Z' }));
    openFinanceService.obterContasPluggy.and.returnValue(of([]));
    openFinanceService.obterVisaoGeralPluggy.and.returnValue(of({ accounts: [], balancesByCurrencyAndType: [], transactions: [] } as any));
    openFinanceService.removerConexao.and.returnValue(of(void 0));
    openFinanceService.registrarConexao.and.returnValue(of({ id: 'connection-1' } as any));
    openFinanceService.importarTransacaoPluggy.and.returnValue(of({} as any));

    localStorage.removeItem('yourmoney.openfinance.carteira');
    component = new OpenFinancePageComponent(openFinanceService, {} as any, carteiraService, contaFinanceiraService);
    component.carteiras = [carteira];
    component.carteiraSelecionadaId = carteira.id;
  });

  it('loads sources and readiness without enabling real data', () => {
    component.carregarFontes();

    expect(component.estadoFontes).toBe('loaded');
    expect(component.fontes.length).toBe(2);
    expect(component.readiness?.mode).toBe('preview-only');
    expect(component.readiness?.realDataEnabled).toBeFalse();
  });

  it('shows empty and error states for sources', () => {
    openFinanceService.obterFontes.and.returnValue(of({ ...sourcesResponse, sources: [] }));

    component.carregarFontes();

    expect(component.estadoFontes).toBe('empty');

    openFinanceService.obterFontes.and.returnValue(throwError(() => new Error('falha')));
    component.carregarFontes();

    expect(component.estadoFontes).toBe('error');
    expect(component.mensagemErroFontes).toContain('Não foi possível');
  });

  it('preserves last known source status after a reload failure', () => {
    component.carregarFontes();
    openFinanceService.obterFontes.and.returnValue(throwError(() => new Error('falha')));

    component.carregarFontes();

    expect(component.estadoFontes).toBe('loaded');
    expect(component.fontes.length).toBe(2);
    expect(component.readiness?.summary).toBe('Somente preview');
  });

  it('loads transaction preview and keeps status preview-only', () => {
    component.carregarPreview();

    expect(component.mostrarDemonstracao).toBeTrue();
    expect(openFinanceService.obterPreviewTransacoes).toHaveBeenCalledWith('mock-transactions');
    expect(component.estadoPreview).toBe('loaded');
    expect(component.transacoes.length).toBe(2);
    expect(component.transacoes.every(item => item.importStatus === 'preview-only')).toBeTrue();
    expect(component.transacoes.some(item => item.duplicateRisk)).toBeTrue();
  });

  it('keeps the demonstration hidden and does not fetch it on initialization', () => {
    spyOn(component, 'carregarFontes');
    spyOn(component, 'carregarConfiguracaoCredenciaisPluggy');
    spyOn(component, 'carregarDadosPluggy');
    spyOn(component as any, 'carregarCarteiras');
    const carregarPreview = spyOn(component, 'carregarPreview');

    component.ngOnInit();

    expect(component.mostrarDemonstracao).toBeFalse();
    expect(component.estadoPreview).toBe('idle');
    expect(carregarPreview).not.toHaveBeenCalled();
    expect((component as any).carregarCarteiras).toHaveBeenCalled();
  });

  it('shows and loads the selected source after choosing to view the demonstration', () => {
    component.escolherFonte(sourcesResponse.sources[0]);

    expect(component.mostrarDemonstracao).toBeTrue();
    expect(component.fonteSelecionada).toBe('mock-transactions');
    expect(openFinanceService.obterPreviewTransacoes).toHaveBeenCalledWith('mock-transactions');
  });

  it('updates suggested classification locally only', () => {
    component.carregarPreview();

    component.atualizarClassificacaoLocal(component.transacoes[0], 'despesa');

    expect(component.transacoes[0].suggestedFinancialType).toBe('despesa');
    expect(openFinanceService.obterPreviewTransacoes).toHaveBeenCalledTimes(1);
  });

  it('shows error state for preview failures', () => {
    openFinanceService.obterPreviewTransacoes.and.returnValue(throwError(() => new Error('falha')));

    component.carregarPreview();

    expect(component.estadoPreview).toBe('error');
    expect(component.transacoes.length).toBe(0);
    expect(component.mensagemErroPreview).toContain('Não foi possível');
  });

  it('creates and selects a wallet using the wallet API', () => {
    const secondWallet: Carteira = { id: 'wallet-2', nome: 'Carteira da família', principal: false };
    carteiraService.criar.and.returnValue(of(secondWallet));
    carteiraService.listar.and.returnValue(of([carteira, secondWallet]));
    component.abrirEditorCarteira();
    component.nomeCarteira = secondWallet.nome;

    component.salvarCarteira();

    expect(carteiraService.criar).toHaveBeenCalledWith({ nome: secondWallet.nome });
    expect(component.carteiraSelecionadaId).toBe(secondWallet.id);
    expect(localStorage.getItem('yourmoney.openfinance.carteira')).toBe(secondWallet.id);
    expect(openFinanceService.obterConexoes).toHaveBeenCalledWith(secondWallet.id);
  });

  it('shows wallet loading and a recoverable error when the wallet request fails', () => {
    const pending = new Subject<Carteira[]>();
    carteiraService.listar.and.returnValue(pending);

    (component as any).carregarCarteiras();
    expect(component.carregandoCarteiras).toBeTrue();

    pending.error(new Error('offline'));

    expect(component.carregandoCarteiras).toBeFalse();
    expect(component.erroCarteiras).toContain('Não foi possível carregar suas carteiras');
  });

  it('renames the selected wallet and keeps the new name after reload', () => {
    const renamed: Carteira = { ...carteira, nome: 'Carteira pessoal' };
    carteiraService.renomear.and.returnValue(of(renamed));
    carteiraService.listar.and.returnValue(of([renamed]));
    component.abrirEditorCarteira(carteira);
    component.nomeCarteira = renamed.nome;

    component.salvarCarteira();

    expect(carteiraService.renomear).toHaveBeenCalledWith(carteira.id, { nome: renamed.nome });
    expect(component.carteiras[0].nome).toBe(renamed.nome);
    expect(component.mostrarEditorCarteira).toBeFalse();
  });

  it('does not create a wallet without its required name', () => {
    component.abrirEditorCarteira();
    component.nomeCarteira = '   ';

    component.salvarCarteira();

    expect(carteiraService.criar).not.toHaveBeenCalled();
    expect(carteiraService.renomear).not.toHaveBeenCalled();
  });

  it('requires confirmation before deleting a non-principal wallet', () => {
    const secondWallet: Carteira = { id: 'wallet-2', nome: 'Carteira da família', principal: false };
    carteiraService.remover.and.returnValue(of(void 0));
    carteiraService.listar.and.returnValue(of([carteira]));
    component.carteiras = [carteira, secondWallet];
    component.selecionarCarteira(secondWallet.id);
    spyOn(window, 'confirm').and.returnValue(true);

    component.removerCarteira();

    expect(window.confirm).toHaveBeenCalled();
    expect(carteiraService.remover).toHaveBeenCalledWith(secondWallet.id);
    expect(component.carteiraSelecionadaId).toBe(carteira.id);
  });

  it('saves a manual account in the selected wallet', () => {
    contaFinanceiraService.criarConta.and.returnValue(of({ id: 'account-1', descricao: 'Banco Inter', carteiraId: carteira.id }));
    component.novaContaBancaria = 'Banco Inter';
    component.mostrandoCadastroConta = true;

    component.cadastrarContaBancaria();

    expect(contaFinanceiraService.criarConta).toHaveBeenCalledWith({ descricao: 'Banco Inter', carteiraId: carteira.id });
    expect(component.contasFinanceiras[0].descricao).toBe('Banco Inter');
    expect(component.mostrandoCadastroConta).toBeFalse();
  });

  it('requires a name before creating a manual account', () => {
    component.novaContaBancaria = '  ';

    component.cadastrarContaBancaria();

    expect(contaFinanceiraService.criarConta).not.toHaveBeenCalled();
  });

  it('loads accounts in the selected wallet and offers only accounts from elsewhere to move', () => {
    const selectedAccount = { id: 'account-selected', descricao: 'Conta da carteira', carteiraId: carteira.id };
    const otherAccount = { id: 'account-other', descricao: 'Conta de outra carteira', carteiraId: 'wallet-2' };
    contaFinanceiraService.listarContas.and.returnValues(of([selectedAccount]), of([selectedAccount, otherAccount]));

    (component as any).carregarContasFinanceiras();

    expect(contaFinanceiraService.listarContas).toHaveBeenCalledWith(carteira.id);
    expect(contaFinanceiraService.listarContas).toHaveBeenCalledWith();
    expect(component.contasFinanceiras).toEqual([selectedAccount]);
    expect(component.contasEmOutrasCarteiras).toEqual([otherAccount]);
  });

  it('requires confirmation before moving an existing account', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    const account = { id: 'account-existing', descricao: 'Conta conjunta', carteiraId: 'wallet-old' };
    component.contasEmOutrasCarteiras = [account];
    component.contaParaMoverId = account.id;
    contaFinanceiraService.moverConta.and.returnValue(of({ ...account, carteiraId: carteira.id }));

    component.moverContaBancaria();

    expect(contaFinanceiraService.moverConta).toHaveBeenCalledWith(account.id, carteira.id);
    expect(window.confirm).toHaveBeenCalled();
  });

  it('identifies only available sources as preview capable', () => {
    expect(component.fonteSuportaPreview(sourcesResponse.sources[0])).toBeTrue();
    expect(component.fonteSuportaPreview(sourcesResponse.sources[1])).toBeFalse();
  });

  it('checks real provider availability without storing the connect token', () => {
    component.verificarProvedor();
    expect(component.provedorDisponivel).toBeTrue();
    expect(component.mensagemProvedor).toContain('disponível');
    expect(localStorage.getItem('pluggy_token')).toBeNull();
  });

  it('keeps the demonstration usable when the real provider is not configured', () => {
    openFinanceService.verificarProvedor.and.returnValue(throwError(() => ({ status: 503 })));
    component.verificarProvedor();
    expect(component.provedorDisponivel).toBeFalse();
    expect(component.mensagemProvedor).toContain('não configurado');
    expect(component.estadoPreview).not.toBe('error');
  });

  it('does not report no connections or allow connecting when the server returns 503', () => {
    openFinanceService.obterConexoes.and.returnValue(throwError(() => ({ status: 503 })));

    (component as any).carregarConexoesPluggy();

    expect(component.conexoesPluggy).toEqual([]);
    expect(component.conexoesPluggyCarregadas).toBeFalse();
    expect(component.configuracaoServidorPluggyPendente).toBeTrue();
    expect(component.erroCarregamentoConexoesPluggy).toContain('não está configurado no servidor');
    expect(component.mostrarSemConexoesPluggy).toBeFalse();
    expect(component.podeMostrarVisaoGeralPluggy).toBeFalse();
    expect(component.podeAdicionarConexao).toBeFalse();

    component.conectarBanco();

    expect(openFinanceService.obterConnectToken).not.toHaveBeenCalled();
    expect(component.mensagemProvedor).toContain('Configure as credenciais');
  });

  it('shows the no-connection state only after connections load successfully', () => {
    component.configuracaoCredenciaisPluggy = {
      configured: true,
      source: 'server',
      clientIdHint: 'abcd…wxyz',
      updatedAt: null,
      canSave: false,
    };
    openFinanceService.obterConexoes.and.returnValue(of([]));

    (component as any).carregarConexoesPluggy();

    expect(component.conexoesPluggyCarregadas).toBeTrue();
    expect(component.mostrarSemConexoesPluggy).toBeTrue();
    expect(component.podeAdicionarConexao).toBeTrue();
  });

  it('uses readable connection states and keeps the five-bank limit visible', () => {
    const connection = {
      id: 'connection-1', institutionName: 'Banco Exemplo', status: 'UPDATED',
      isSandbox: false, connectedAt: '2026-10-01T12:00:00Z',
      lastUpdatedAt: null, consentExpiresAt: null,
    };
    expect(component.rotuloStatusConexao(connection)).toBe('Atualizada');
    expect(component.rotuloStatusConexao({ ...connection, status: 'UPDATING' })).toBe('Atualizando');
    expect(component.rotuloStatusConexao({ ...connection, status: 'LOGIN_ERROR' })).toBe('Atenção necessária');
    expect(component.rotuloStatusConexao({ ...connection, status: 'USER_AUTHORIZATION_EXPIRED' })).toBe('Autorização expirada');

    component.configuracaoCredenciaisPluggy = {
      configured: true, source: 'server', clientIdHint: null, updatedAt: null, canSave: false,
    };
    component.conexoesPluggyCarregadas = true;
    component.conexoesPluggy = Array.from({ length: 5 }, (_, index) => ({ ...connection, id: `connection-${index}` }));
    expect(component.podeAdicionarConexao).toBeFalse();
    expect(component.textoBotaoConexaoPluggy).toBe('Limite de 5 bancos atingido');
  });

  it('shows missing credentials and closes configured credentials after a wallet switch', () => {
    component.selecionarCarteira(carteira.id);
    expect(component.configuracaoPluggyVisivel).toBeTrue();

    component.configuracaoPluggyVisivel = true;
    openFinanceService.obterConfiguracaoCredenciaisPluggy.and.returnValue(of({
      configured: true, source: 'database', clientIdHint: 'abcd…wxyz', updatedAt: null, canSave: true,
    }));
    component.selecionarCarteira(carteira.id);
    expect(component.configuracaoPluggyVisivel).toBeFalse();

    component.configuracaoPluggyVisivel = true;
    expect(component.configuracaoPluggyVisivel).toBeTrue();
    component.clientIdPluggy = 'client-id';
    component.clientSecretPluggy = 'client-secret';
    component.salvarCredenciaisPluggy();
    expect(component.configuracaoPluggyVisivel).toBeFalse();
    expect(component.clientSecretPluggy).toBe('');
  });

  it('shows the safe reason returned by the API when starting a connection fails', () => {
    component.configuracaoCredenciaisPluggy = {
      configured: true,
      source: 'server',
      clientIdHint: 'abcd…wxyz',
      updatedAt: null,
      canSave: false,
    };
    openFinanceService.obterConexoes.and.returnValue(of([]));
    (component as any).carregarConexoesPluggy();
    openFinanceService.obterConnectToken.and.returnValue(throwError(() => ({
      status: 503,
      error: { message: 'Não foi possível abrir as credenciais protegidas.' },
    })));

    component.conectarBanco();

    expect(component.mensagemProvedor).toBe('Não foi possível abrir as credenciais protegidas.');
    expect(openFinanceService.obterConnectToken).toHaveBeenCalledWith(undefined, carteira.id);
  });
});
