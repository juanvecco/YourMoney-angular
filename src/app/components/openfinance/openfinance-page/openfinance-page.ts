import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  OpenFinanceReadiness, OpenFinanceSource, OpenFinanceSuggestedFinancialType,
  OpenFinanceTransactionPreview,
} from '../../../models/openfinance.model';
import { OpenFinanceService } from '../../../services/openfinance';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ViewStateComponent } from '../../shared/view-state/view-state';
import { FinancialValuePipe } from '../../../pipes/financial-value.pipe';
import { firstValueFrom } from 'rxjs';
import {
  PluggyAccount, PluggyConnection, PluggyCredentialStatus, PluggyOverview,
  PluggyTransactionImportRequest, PluggyTransactionPreview,
} from '../../../models/pluggy.model';
import { Despesa, Categoria, ContaFinanceira } from '../../../models/despesa.model';
import { DespesaService } from '../../../services/despesa';
import { CarteiraService } from '../../../services/carteira';
import { ContaFinanceiraService } from '../../../services/conta';
import { Carteira } from '../../../models/carteira.model';

type ViewState = 'idle' | 'loading' | 'loaded' | 'empty' | 'error';

@Component({
  selector: 'app-openfinance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FinancialValuePipe, RouterLink, PageHeaderComponent, ViewStateComponent],
  templateUrl: './openfinance-page.html',
  styleUrls: ['./openfinance-page.css', './openfinance-connections.css'],
})
export class OpenFinancePageComponent implements OnInit {
  carteiras: Carteira[] = [];
  carteiraSelecionadaId = '';
  carregandoCarteiras = false;
  erroCarteiras = '';
  mostrarEditorCarteira = false;
  carteiraEmEdicao: Carteira | null = null;
  nomeCarteira = '';
  salvandoCarteira = false;
  erroSalvarCarteira = '';
  contasFinanceiras: ContaFinanceira[] = [];
  contasEmOutrasCarteiras: ContaFinanceira[] = [];
  carregandoContasFinanceiras = false;
  mostrandoCadastroConta = false;
  novaContaBancaria = '';
  salvandoContaBancaria = false;
  contaFinanceiraErro = '';
  contaParaMoverId = '';
  fontes: OpenFinanceSource[] = [];
  readiness: OpenFinanceReadiness | null = null;
  transacoes: OpenFinanceTransactionPreview[] = [];
  estadoFontes: ViewState = 'loading';
  estadoPreview: ViewState = 'idle';
  mensagemErroFontes = '';
  mensagemErroPreview = '';
  verificandoProvedor = false;
  mensagemProvedor = '';
  provedorDisponivel: boolean | null = null;
  conexoesPluggy: PluggyConnection[] = [];
  contasPluggy: PluggyAccount[] = [];
  contasDisponiveisPluggy: PluggyAccount[] = [];
  transacoesPluggy: PluggyTransactionPreview[] = [];
  saldosPluggy: PluggyOverview['balancesByCurrencyAndType'] = [];
  visaoGeralPluggy: PluggyOverview | null = null;
  carregandoConexoesPluggy = false;
  conexoesPluggyCarregadas = false;
  erroCarregamentoConexoesPluggy = '';
  configuracaoServidorPluggyPendente = false;
  carregandoContasPluggy = false;
  carregandoTransacoesPluggy = false;
  conectandoBanco = false;
  salvandoConexao = false;
  conexaoSendoRemovida: string | null = null;
  mensagemContasPluggy = '';
  mensagemTransacoesPluggy = '';
  mensagemSucessoImportacao = '';
  filtroInstituicaoPluggy = '';
  filtroContaPluggy = '';
  filtroDataInicioPluggy = this.formatarDataInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  filtroDataFimPluggy = this.formatarDataInput(new Date());
  transacaoEmRevisao: PluggyTransactionPreview | null = null;
  carregandoCadastrosImportacao = false;
  salvandoImportacao = false;
  erroImportacao = '';
  contasFinanceirasImportacao: ContaFinanceira[] = [];
  categoriasImportacao: Categoria[] = [];
  tiposDespesaImportacao: Categoria[] = [];
  naturezasDespesaImportacao: Categoria[] = [];
  categoriasEspecificasImportacao: Categoria[] = [];
  despesasVinculaveisImportacao: Despesa[] = [];
  formImportacao = {
    recordType: '' as 'expense' | 'revenue' | '',
    descricao: '',
    valor: 0,
    data: '',
    idContaFinanceira: '',
    idTipoDespesa: '',
    idNaturezaDespesa: '',
    idCategoriaEspecifica: '',
    naturezaReceita: 'RendaDisponivel' as 'RendaDisponivel' | 'EntradaVinculadaDespesa' | 'Reembolso',
    despesaVinculadaId: '',
  };
  configuracaoCredenciaisPluggy: PluggyCredentialStatus | null = null;
  carregandoConfiguracaoPluggy = false;
  salvandoCredenciaisPluggy = false;
  clientIdPluggy = '';
  clientSecretPluggy = '';
  mensagemConfiguracaoPluggy = '';
  configuracaoPluggyVisivel = false;
  mostrarDemonstracao = false;
  fonteSelecionada = 'mock-transactions';
  private fontesRevision = 0;
  private previewRevision = 0;
  private overviewRevision = 0;

  constructor(
    private readonly openFinanceService: OpenFinanceService,
    private readonly despesaService: DespesaService,
    private readonly carteiraService: CarteiraService,
    private readonly contaFinanceiraService: ContaFinanceiraService,
  ) {}

  ngOnInit(): void {
    this.carregarFontes();
    this.carregarCarteiras();
  }

  private carregarCarteiras(): void {
    this.carregandoCarteiras = true;
    this.erroCarteiras = '';
    this.carteiraService.listar().subscribe({
      next: carteiras => {
        this.carteiras = carteiras;
        const savedId = localStorage.getItem('yourmoney.openfinance.carteira');
        this.carteiraSelecionadaId = carteiras.some(wallet => wallet.id === savedId)
          ? savedId!
          : carteiras.find(wallet => wallet.principal)?.id ?? carteiras[0]?.id ?? '';
        this.carregandoCarteiras = false;
        if (this.carteiraSelecionadaId) this.selecionarCarteira(this.carteiraSelecionadaId);
      },
      error: () => {
        this.carregandoCarteiras = false;
        this.erroCarteiras = 'Não foi possível carregar suas carteiras. Atualize a página e tente novamente.';
      },
    });
  }

  selecionarCarteira(carteiraId: string): void {
    if (!this.carteiras.some(wallet => wallet.id === carteiraId)) return;
    this.carteiraSelecionadaId = carteiraId;
    localStorage.setItem('yourmoney.openfinance.carteira', carteiraId);
    this.configuracaoCredenciaisPluggy = null;
    this.contaFinanceiraErro = '';
    this.mostrandoCadastroConta = false;
    this.novaContaBancaria = '';
    this.conexoesPluggy = [];
    this.contasPluggy = [];
    this.contasDisponiveisPluggy = [];
    this.contasFinanceirasImportacao = [];
    this.visaoGeralPluggy = null;
    this.configuracaoPluggyVisivel = false;
    this.conexoesPluggyCarregadas = false;
    this.erroCarregamentoConexoesPluggy = '';
    this.carregarConfiguracaoCredenciaisPluggy();
    this.carregarContasFinanceiras();
    this.carregarDadosPluggy();
  }

  abrirEditorCarteira(carteira?: Carteira): void {
    this.carteiraEmEdicao = carteira ?? null;
    this.nomeCarteira = carteira?.nome ?? '';
    this.erroSalvarCarteira = '';
    this.mostrarEditorCarteira = true;
  }

  salvarCarteira(): void {
    const name = this.nomeCarteira.trim();
    if (!name || this.salvandoCarteira) return;
    this.salvandoCarteira = true;
    this.erroSalvarCarteira = '';
    const request = { nome: name };
    const operation = this.carteiraEmEdicao
      ? this.carteiraService.renomear(this.carteiraEmEdicao.id, request)
      : this.carteiraService.criar(request);
    operation.subscribe({
      next: wallet => {
        this.salvandoCarteira = false;
        this.mostrarEditorCarteira = false;
        this.carteiraEmEdicao = null;
        this.carteiraService.listar().subscribe(wallets => {
          this.carteiras = wallets;
          this.selecionarCarteira(wallet.id);
        });
      },
      error: error => {
        this.salvandoCarteira = false;
        this.erroSalvarCarteira = error?.error?.detail ?? error?.error?.message ?? 'Não foi possível salvar a carteira.';
      },
    });
  }

  removerCarteira(): void {
    const wallet = this.carteiraSelecionada;
    if (!wallet || wallet.principal || !window.confirm(`Excluir a carteira “${wallet.nome}”? A exclusão só funciona quando ela estiver sem contas e conexões.`)) return;
    this.carteiraService.remover(wallet.id).subscribe({
      next: () => this.carregarCarteiras(),
      error: error => window.alert(error?.error?.detail ?? 'Remova as contas e conexões desta carteira antes de excluí-la.'),
    });
  }

  private carregarContasFinanceiras(): void {
    if (!this.carteiraSelecionadaId) return;
    const walletId = this.carteiraSelecionadaId;
    this.carregandoContasFinanceiras = true;
    this.contaFinanceiraService.listarContas(walletId).subscribe({
      next: contas => { if (walletId === this.carteiraSelecionadaId) { this.contasFinanceiras = contas; this.carregandoContasFinanceiras = false; } },
      error: () => { if (walletId === this.carteiraSelecionadaId) { this.contasFinanceiras = []; this.carregandoContasFinanceiras = false; this.contaFinanceiraErro = 'Não foi possível carregar as contas desta carteira.'; } },
    });
    this.contaFinanceiraService.listarContas().subscribe({
      next: todas => this.contasEmOutrasCarteiras = todas.filter(account => account.carteiraId !== this.carteiraSelecionadaId),
      error: () => this.contasEmOutrasCarteiras = [],
    });
  }

  cadastrarContaBancaria(): void {
    const name = this.novaContaBancaria.trim();
    if (!name || !this.carteiraSelecionadaId || this.salvandoContaBancaria) return;
    this.salvandoContaBancaria = true;
    this.contaFinanceiraErro = '';
    this.contaFinanceiraService.criarConta({ descricao: name, carteiraId: this.carteiraSelecionadaId }).subscribe({
      next: account => {
        this.contasFinanceiras = [...this.contasFinanceiras, account].sort((a, b) => a.descricao.localeCompare(b.descricao));
        this.novaContaBancaria = '';
        this.mostrandoCadastroConta = false;
        this.salvandoContaBancaria = false;
      },
      error: error => {
        this.salvandoContaBancaria = false;
        this.contaFinanceiraErro = error?.error?.detail ?? error?.error?.message ?? 'Não foi possível cadastrar a conta bancária.';
      },
    });
  }

  moverContaBancaria(): void {
    const account = this.contasEmOutrasCarteiras.find(item => item.id === this.contaParaMoverId);
    if (!account || !this.carteiraSelecionadaId) return;
    if (!window.confirm(`Mover “${account.descricao}” para “${this.carteiraSelecionada?.nome}”? Os lançamentos vinculados serão preservados.`)) return;
    this.contaFinanceiraService.moverConta(account.id, this.carteiraSelecionadaId).subscribe({
      next: () => { this.contaParaMoverId = ''; this.carregarContasFinanceiras(); },
      error: error => this.contaFinanceiraErro = error?.error?.detail ?? 'Não foi possível mover esta conta.',
    });
  }

  get carteiraSelecionada(): Carteira | null {
    return this.carteiras.find(wallet => wallet.id === this.carteiraSelecionadaId) ?? null;
  }

  carregarConfiguracaoCredenciaisPluggy(): void {
    const walletId = this.carteiraSelecionadaId;
    if (!walletId) return;
    this.carregandoConfiguracaoPluggy = true;
    this.mensagemConfiguracaoPluggy = '';
    this.openFinanceService.obterConfiguracaoCredenciaisPluggy(walletId).subscribe({
      next: status => {
        if (walletId !== this.carteiraSelecionadaId) return;
        this.configuracaoCredenciaisPluggy = status;
        this.carregandoConfiguracaoPluggy = false;
        this.configuracaoPluggyVisivel = !status.configured && status.canSave;
      },
      error: error => {
        if (walletId !== this.carteiraSelecionadaId) return;
        this.carregandoConfiguracaoPluggy = false;
        if (error?.status === 403) {
          this.configuracaoPluggyVisivel = false;
          return;
        }
        const mensagemServidor = typeof error?.error?.message === 'string'
          ? error.error.message.trim()
          : '';
        this.mensagemConfiguracaoPluggy = error?.status === 503
          ? mensagemServidor || 'O servidor ainda não está configurado para a integração Pluggy.'
          : 'Não foi possível consultar a configuração das credenciais Pluggy.';
      },
    });
  }

  salvarCredenciaisPluggy(): void {
    if (this.salvandoCredenciaisPluggy || !this.clientIdPluggy.trim() || !this.clientSecretPluggy) return;
    this.salvandoCredenciaisPluggy = true;
    this.mensagemConfiguracaoPluggy = '';
    const walletId = this.carteiraSelecionadaId;
    this.openFinanceService.salvarConfiguracaoCredenciaisPluggy(
      this.clientIdPluggy.trim(),
      this.clientSecretPluggy,
      walletId,
    ).subscribe({
      next: status => {
        if (walletId !== this.carteiraSelecionadaId) return;
        this.configuracaoCredenciaisPluggy = status;
        this.clientIdPluggy = '';
        this.clientSecretPluggy = '';
        this.salvandoCredenciaisPluggy = false;
        this.mensagemConfiguracaoPluggy = 'Credenciais validadas e salvas com proteção no servidor.';
        this.configuracaoPluggyVisivel = false;
        this.carregarDadosPluggy();
      },
      error: error => {
        if (walletId !== this.carteiraSelecionadaId) return;
        this.salvandoCredenciaisPluggy = false;
        this.mensagemConfiguracaoPluggy = error?.error?.message
          ?? 'Não foi possível validar e salvar as credenciais. Confira os dados e tente novamente.';
      },
    });
  }

  carregarFontes(): void {
    const revision = ++this.fontesRevision;
    this.estadoFontes = 'loading';
    this.mensagemErroFontes = '';
    this.openFinanceService.obterFontes().subscribe({
      next: response => {
        if (revision !== this.fontesRevision) return;
        this.readiness = response.readiness;
        this.fontes = response.sources;
        this.estadoFontes = response.sources.length ? 'loaded' : 'empty';
      },
      error: () => {
        if (revision !== this.fontesRevision) return;
        this.estadoFontes = this.fontes.length ? 'loaded' : 'error';
        this.mensagemErroFontes = 'Não foi possível atualizar as fontes Open Finance.';
      },
    });
  }

  carregarPreview(sourceId = this.fonteSelecionada): void {
    this.mostrarDemonstracao = true;
    const revision = ++this.previewRevision;
    this.estadoPreview = 'loading';
    this.mensagemErroPreview = '';
    this.openFinanceService.obterPreviewTransacoes(sourceId).subscribe({
      next: response => {
        if (revision !== this.previewRevision) return;
        this.transacoes = response.items.map(item => ({ ...item }));
        this.estadoPreview = response.items.length ? 'loaded' : 'empty';
      },
      error: () => {
        if (revision !== this.previewRevision) return;
        this.transacoes = [];
        this.estadoPreview = 'error';
        this.mensagemErroPreview = 'Não foi possível carregar a demonstração de transações.';
      },
    });
  }

  verificarProvedor(): void {
    if (this.verificandoProvedor) return;
    this.verificandoProvedor = true;
    this.mensagemProvedor = '';
    this.openFinanceService.verificarProvedor(this.carteiraSelecionadaId).subscribe({
      next: () => {
        this.verificandoProvedor = false;
        this.provedorDisponivel = true;
        this.mensagemProvedor = 'Provedor disponível para iniciar uma conexão segura.';
      },
      error: error => {
        this.verificandoProvedor = false;
        this.provedorDisponivel = false;
        this.mensagemProvedor = error?.status === 503
          ? 'Provedor real ainda não configurado. A demonstração continua disponível.'
          : 'Não foi possível verificar o provedor agora. Tente novamente.';
      },
    });
  }

  conectarBanco(conexao?: PluggyConnection): void {
    if (this.conectandoBanco || this.salvandoConexao) return;
    if (!this.podeConectarBanco) {
      this.mensagemProvedor = this.configuracaoPluggyAusente
        ? 'Configure as credenciais da aplicação Pluggy antes de conectar um banco.'
        : this.erroCarregamentoConexoesPluggy || 'Carregue as conexões Meu Pluggy antes de iniciar uma nova autorização.';
      return;
    }
    if (!conexao && this.limiteConexoesAtingido) return;
    const walletId = this.carteiraSelecionadaId;
    this.conectandoBanco = true;
    this.mensagemProvedor = '';
    this.openFinanceService.obterConnectToken(conexao?.id, walletId).subscribe({
      next: token => void this.abrirWidgetPluggy(token.accessToken, token.connectionId, walletId),
      error: error => {
        this.conectandoBanco = false;
        this.provedorDisponivel = false;
        const status = error?.status as number | undefined;
        const apiMessage = typeof error?.error?.message === 'string' ? error.error.message.trim() : '';
        this.mensagemProvedor = status === 503
          ? apiMessage || 'O Meu Pluggy ainda não está configurado no servidor.'
          : status === 409
            ? 'O limite gratuito de cinco conexões foi atingido.'
            : status === 403
                ? 'A integração não está autorizada para esta carteira. Confira o titular e as credenciais configuradas.'
              : status === 401
                ? 'Sua sessão não foi aceita pela API. Entre novamente no YourMoney e tente de novo.'
                : status === 0
                  ? 'Não foi possível conectar à API do YourMoney. Verifique se o servidor local está ativo.'
                  : status === 502
                    ? `${apiMessage || 'Não foi possível comunicar com a Pluggy agora.'} (HTTP 502). Confira as credenciais Pluggy salvas e tente novamente.`
                    : status === 500
                      ? 'A API do YourMoney encontrou um erro interno (HTTP 500) ao iniciar a conexão.'
                      : status
                        ? `Não foi possível iniciar a conexão. A API respondeu com HTTP ${status}.`
                        : 'Não foi possível iniciar a conexão agora. Tente novamente.';
      },
    });
  }

  private async abrirWidgetPluggy(connectToken: string, connectionId: string | null | undefined, walletId: string): Promise<void> {
    try {
      const { PluggyConnect } = await import('pluggy-connect-sdk');
      const widget = new PluggyConnect({
        connectToken,
        includeSandbox: false,
        allowFullscreen: true,
        language: 'pt',
        countries: ['BR'],
        connectorIds: [200],
        onSuccess: async (data: { item: { id: string } }) => {
          this.salvandoConexao = true;
          this.mensagemProvedor = 'Autorização concluída. Salvando conexão Meu Pluggy...';
          try {
            await firstValueFrom(this.openFinanceService.registrarConexao(data.item.id, connectionId, walletId));
            this.provedorDisponivel = true;
            this.mensagemProvedor = 'Conexão Meu Pluggy salva com segurança.';
            this.carregarDadosPluggy();
          } catch {
            this.provedorDisponivel = false;
            this.mensagemProvedor = 'A autorização terminou, mas não foi possível salvar a conexão Meu Pluggy. Tente novamente.';
          } finally {
            this.salvandoConexao = false;
            this.conectandoBanco = false;
          }
        },
        onError: () => {
          this.provedorDisponivel = false;
          this.mensagemProvedor = 'A autorização Meu Pluggy não foi concluída. Verifique sua conta e tente novamente.';
          this.conectandoBanco = false;
        },
        onClose: () => {
          if (!this.salvandoConexao) this.conectandoBanco = false;
        },
      });
      await widget.init();
    } catch {
      this.conectandoBanco = false;
      this.mensagemProvedor = 'Não foi possível abrir a autorização segura do Meu Pluggy. Tente novamente.';
    }
  }

  carregarDadosPluggy(): void {
    if (!this.carteiraSelecionadaId) return;
    this.carregarConexoesPluggy();
    this.carregarContasDisponiveisPluggy();
    this.carregarVisaoGeralPluggy();
  }

  private carregarContasDisponiveisPluggy(): void {
    const walletId = this.carteiraSelecionadaId;
    this.openFinanceService.obterContasPluggy(walletId).subscribe({
      next: contas => { if (walletId === this.carteiraSelecionadaId) this.contasDisponiveisPluggy = contas; },
      error: () => { if (walletId === this.carteiraSelecionadaId) this.contasDisponiveisPluggy = this.visaoGeralPluggy?.accounts ?? []; },
    });
  }

  onInstituicaoPluggyChange(): void {
    this.filtroContaPluggy = '';
    this.carregarVisaoGeralPluggy();
  }

  get contasFiltradasFiltroPluggy(): PluggyAccount[] {
    return this.contasDisponiveisPluggy.filter(conta =>
      !this.filtroInstituicaoPluggy || conta.connectionId === this.filtroInstituicaoPluggy,
    );
  }

  private carregarConexoesPluggy(): void {
    const walletId = this.carteiraSelecionadaId;
    this.carregandoConexoesPluggy = true;
    this.erroCarregamentoConexoesPluggy = '';
    this.openFinanceService.obterConexoes(walletId).subscribe({
      next: conexoes => {
        if (walletId !== this.carteiraSelecionadaId) return;
        this.conexoesPluggy = conexoes;
        this.conexoesPluggyCarregadas = true;
        this.configuracaoServidorPluggyPendente = false;
        this.carregandoConexoesPluggy = false;
      },
      error: error => {
        if (walletId !== this.carteiraSelecionadaId) return;
        this.carregandoConexoesPluggy = false;
        this.conexoesPluggy = [];
        this.conexoesPluggyCarregadas = false;
        this.configuracaoServidorPluggyPendente = error?.status === 503;
        this.erroCarregamentoConexoesPluggy = this.mensagemErroPluggy(
          error?.status,
          'Não foi possível carregar as conexões Meu Pluggy.',
          error?.error?.message,
        );
      },
    });
  }

  carregarVisaoGeralPluggy(): void {
    const walletId = this.carteiraSelecionadaId;
    if (!walletId) return;
    const revision = ++this.overviewRevision;
    this.carregandoContasPluggy = true;
    this.carregandoTransacoesPluggy = true;
    this.mensagemContasPluggy = '';
    this.mensagemTransacoesPluggy = '';
    this.mensagemSucessoImportacao = '';
    this.openFinanceService.obterVisaoGeralPluggy({
      connectionId: this.filtroInstituicaoPluggy || undefined,
      accountId: this.filtroContaPluggy || undefined,
      from: this.filtroDataInicioPluggy || undefined,
      to: this.filtroDataFimPluggy || undefined,
    }, walletId).subscribe({
      next: overview => {
        if (revision !== this.overviewRevision) return;
        this.visaoGeralPluggy = overview;
        this.contasPluggy = overview.accounts;
        this.saldosPluggy = overview.balancesByCurrencyAndType;
        this.transacoesPluggy = overview.transactions;
        this.carregandoContasPluggy = false;
        this.carregandoTransacoesPluggy = false;
      },
      error: error => {
        if (revision !== this.overviewRevision) return;
        this.carregandoContasPluggy = false;
        this.carregandoTransacoesPluggy = false;
        this.visaoGeralPluggy = null;
        this.contasPluggy = [];
        this.saldosPluggy = [];
        this.transacoesPluggy = [];
        const mensagem = this.mensagemErroPluggy(
          error?.status,
          'Não foi possível carregar o resumo do Meu Pluggy.',
          error?.error?.message,
        );
        this.mensagemContasPluggy = mensagem;
        this.mensagemTransacoesPluggy = mensagem;
      },
    });
  }

  desconectarBanco(conexao: PluggyConnection): void {
    if (!window.confirm(`Remover a referência de ${conexao.institutionName} do YourMoney? Isso não revoga os consentimentos bancários no Meu Pluggy.`)) return;
    this.conexaoSendoRemovida = conexao.id;
    this.openFinanceService.removerConexao(conexao.id, this.carteiraSelecionadaId).subscribe({
      next: () => {
        this.conexaoSendoRemovida = null;
        this.carregarDadosPluggy();
      },
      error: () => {
        this.conexaoSendoRemovida = null;
        this.mensagemProvedor = 'Não foi possível remover essa referência. Tente novamente.';
      },
    });
  }

  async abrirRevisaoTransacao(transacao: PluggyTransactionPreview): Promise<void> {
    if (transacao.registrationStatus === 'REGISTERED' || !transacao.importable) return;

    this.transacaoEmRevisao = transacao;
    this.erroImportacao = '';
    this.carregandoCadastrosImportacao = true;
    const data = this.formatarDataInput(new Date(transacao.date));
    const valorOrigem = transacao.currencyCode === 'BRL'
      ? transacao.amount
      : transacao.amountInAccountCurrency ?? transacao.amount;
    this.formImportacao = {
      recordType: this.transacaoExigeClassificacaoManual(transacao)
        ? ''
        : transacao.direction === 'CREDIT' ? 'revenue' : 'expense',
      descricao: transacao.description,
      valor: Math.abs(valorOrigem),
      data,
      idContaFinanceira: '',
      idTipoDespesa: '',
      idNaturezaDespesa: '',
      idCategoriaEspecifica: '',
      naturezaReceita: 'RendaDisponivel',
      despesaVinculadaId: '',
    };

    try {
      const [contas, categorias] = await Promise.all([
        firstValueFrom(this.contaFinanceiraService.listarContas(this.carteiraSelecionadaId)),
        firstValueFrom(this.despesaService.listarCategorias()),
      ]);
      this.contasFinanceirasImportacao = contas;
      this.categoriasImportacao = categorias;
      this.tiposDespesaImportacao = categorias.filter(categoria => !categoria.categoriaPaiId);
      this.naturezasDespesaImportacao = [];
      this.categoriasEspecificasImportacao = [];
      await this.carregarDespesasVinculaveisImportacao();
    } catch {
      this.erroImportacao = 'Não foi possível carregar as contas e categorias cadastradas. Tente novamente.';
    } finally {
      this.carregandoCadastrosImportacao = false;
    }
  }

  fecharRevisaoTransacao(): void {
    if (this.salvandoImportacao) return;
    this.transacaoEmRevisao = null;
    this.erroImportacao = '';
  }

  onTipoDespesaImportacaoChange(): void {
    this.naturezasDespesaImportacao = this.formImportacao.idTipoDespesa
      ? this.categoriasImportacao.filter(categoria => categoria.categoriaPaiId === this.formImportacao.idTipoDespesa)
      : [];
    this.formImportacao.idNaturezaDespesa = '';
    this.formImportacao.idCategoriaEspecifica = '';
    this.categoriasEspecificasImportacao = [];
  }

  onNaturezaDespesaImportacaoChange(): void {
    this.categoriasEspecificasImportacao = this.formImportacao.idNaturezaDespesa
      ? this.categoriasImportacao.filter(categoria => categoria.categoriaPaiId === this.formImportacao.idNaturezaDespesa)
      : [];
    this.formImportacao.idCategoriaEspecifica = '';
  }

  onNaturezaReceitaImportacaoChange(): void {
    if (this.formImportacao.naturezaReceita !== 'Reembolso') {
      this.formImportacao.despesaVinculadaId = '';
      return;
    }
    void this.carregarDespesasVinculaveisImportacao();
  }

  async onDataImportacaoChange(): Promise<void> {
    if (this.formImportacao.recordType === 'revenue' && this.formImportacao.naturezaReceita === 'Reembolso') {
      await this.carregarDespesasVinculaveisImportacao();
    }
  }

  categoriaFinalImportacao(): string {
    return this.formImportacao.idCategoriaEspecifica
      || this.formImportacao.idNaturezaDespesa
      || this.formImportacao.idTipoDespesa;
  }

  formularioImportacaoValido(): boolean {
    return !!(
      this.transacaoEmRevisao
      && (this.formImportacao.recordType === 'expense' || this.formImportacao.recordType === 'revenue')
      && this.formImportacao.descricao.trim()
      && this.formImportacao.valor > 0
      && this.formImportacao.data
      && this.formImportacao.idContaFinanceira
      && (this.formImportacao.recordType === 'revenue'
        ? this.formImportacao.naturezaReceita !== 'Reembolso' || this.formImportacao.despesaVinculadaId
        : this.categoriaFinalImportacao())
    );
  }

  confirmarImportacaoTransacao(): void {
    const transacao = this.transacaoEmRevisao;
    if (!transacao || this.salvandoImportacao) return;
    if (!this.formularioImportacaoValido()) {
      this.erroImportacao = 'Preencha a conta e a classificação obrigatórias antes de confirmar.';
      return;
    }
    const recordType = this.formImportacao.recordType;
    if (recordType !== 'expense' && recordType !== 'revenue') {
      this.erroImportacao = 'Escolha se deseja cadastrar esta transação como despesa ou receita.';
      return;
    }

    const request: PluggyTransactionImportRequest = {
      transactionId: transacao.transactionId,
      recordType,
      description: this.formImportacao.descricao.trim(),
      amount: this.formImportacao.valor,
      date: this.formImportacao.data,
      idContaFinanceira: this.formImportacao.idContaFinanceira,
      idCategoria: recordType === 'expense' ? this.categoriaFinalImportacao() : null,
      natureza: recordType === 'revenue' ? this.formImportacao.naturezaReceita : null,
      despesaVinculadaId: recordType === 'revenue'
        && this.formImportacao.naturezaReceita === 'Reembolso'
        ? this.formImportacao.despesaVinculadaId
        : null,
    };

    this.salvandoImportacao = true;
    this.erroImportacao = '';
    this.openFinanceService.importarTransacaoPluggy(request, this.carteiraSelecionadaId).subscribe({
      next: result => {
        this.marcarTransacaoCadastrada(transacao, result);
        this.transacaoEmRevisao = null;
        this.salvandoImportacao = false;
        this.mensagemSucessoImportacao = result.recordType === 'expense'
          ? 'Despesa cadastrada no histórico do YourMoney.'
          : 'Receita cadastrada no histórico do YourMoney.';
        this.carregarDadosPluggy();
      },
      error: error => {
        this.salvandoImportacao = false;
        const existing = error?.error?.existingImport;
        if (error?.status === 409 && existing?.recordId && existing?.recordType) {
          this.marcarTransacaoCadastrada(transacao, existing);
          this.transacaoEmRevisao = null;
          this.mensagemSucessoImportacao = 'Esta transação já havia sido cadastrada e foi sinalizada no painel.';
          this.carregarDadosPluggy();
          return;
        }
        this.erroImportacao = error?.error?.message
          ?? 'Não foi possível cadastrar a transação. Seus dados continuam preenchidos para tentar novamente.';
      },
    });
  }

  private marcarTransacaoCadastrada(
    transacao: PluggyTransactionPreview,
    result: { recordType: 'expense' | 'revenue'; recordId: string },
  ): void {
    transacao.registrationStatus = 'REGISTERED';
    transacao.registeredRecordType = result.recordType;
    transacao.registeredRecordId = result.recordId;
    transacao.importable = false;
  }

  private async carregarDespesasVinculaveisImportacao(): Promise<void> {
    if (!this.formImportacao.data) {
      this.despesasVinculaveisImportacao = [];
      return;
    }
    const [ano, mes] = this.formImportacao.data.split('-').map(Number);
    try {
      this.despesasVinculaveisImportacao = await firstValueFrom(
        this.despesaService.obterPorReferencia(mes, ano),
      );
    } catch {
      this.despesasVinculaveisImportacao = [];
    }
  }

  obterValorTransacao(transacao: PluggyTransactionPreview): number {
    return Math.abs(transacao.currencyCode === 'BRL'
      ? transacao.amount
      : transacao.amountInAccountCurrency ?? transacao.amount);
  }

  obterRotuloTipoConta(tipo: string): string {
    return tipo === 'CREDIT' ? 'Cartão de crédito' : tipo === 'BANK' ? 'Conta bancária' : 'Conta';
  }

  obterRotuloDirecaoPluggy(direcao: PluggyTransactionPreview['direction']): string {
    return direcao === 'CREDIT' ? 'Entrada' : direcao === 'DEBIT' ? 'Saída' : 'A revisar';
  }

  transacaoExigeClassificacaoManual(transacao: PluggyTransactionPreview): boolean {
    const operationType = transacao.operationType ?? '';
    return transacao.direction === 'UNKNOWN'
      || transacao.status.toUpperCase() === 'PENDING'
      || /transfer|reversal|refund|chargeback|estorno|reembolso/i.test(operationType);
  }

  obterRotaLancamento(transacao: PluggyTransactionPreview): string {
    return transacao.registeredRecordType === 'expense' ? '/despesas' : '/receitas';
  }

  private formatarDataInput(data: Date): string {
    const local = new Date(data.getTime() - data.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  escolherFonte(fonte: OpenFinanceSource): void {
    this.fonteSelecionada = fonte.id;
    this.carregarPreview(fonte.id);
  }

  atualizarClassificacaoLocal(transacao: OpenFinanceTransactionPreview, tipo: OpenFinanceSuggestedFinancialType): void {
    transacao.suggestedFinancialType = tipo;
  }

  fonteSuportaPreview(fonte: OpenFinanceSource): boolean {
    return fonte.supportsTransactionPreview && fonte.status === 'available';
  }

  obterRotuloTipoFonte(tipo: OpenFinanceSource['type']): string {
    return { public: 'Pública', simulated: 'Demonstração', 'future-consent': 'Consentimento futuro' }[tipo];
  }

  obterRotuloStatus(status: OpenFinanceSource['status']): string {
    return {
      available: 'Disponível', unavailable: 'Indisponível', checking: 'Verificando',
      failed: 'Falhou', 'not-configured': 'Não configurada',
    }[status];
  }

  get limiteConexoesAtingido(): boolean {
    return this.conexoesPluggy.length >= 5;
  }

  get configuracaoPluggyAusente(): boolean {
    return this.configuracaoServidorPluggyPendente
      || this.configuracaoCredenciaisPluggy?.configured === false;
  }

  get podeConectarBanco(): boolean {
    return this.conexoesPluggyCarregadas
      && !this.carregandoConexoesPluggy
      && !this.carregandoConfiguracaoPluggy
      && !this.erroCarregamentoConexoesPluggy
      && !this.configuracaoPluggyAusente
      && !this.conectandoBanco
      && !this.salvandoConexao;
  }

  get podeAdicionarConexao(): boolean {
    return this.podeConectarBanco && !this.limiteConexoesAtingido;
  }

  get mostrarSemConexoesPluggy(): boolean {
    return this.conexoesPluggyCarregadas
      && !this.carregandoConexoesPluggy
      && !this.carregandoConfiguracaoPluggy
      && !this.erroCarregamentoConexoesPluggy
      && !this.configuracaoPluggyAusente
      && this.conexoesPluggy.length === 0;
  }

  get podeMostrarVisaoGeralPluggy(): boolean {
    return this.conexoesPluggyCarregadas
      && !this.carregandoConexoesPluggy
      && !this.carregandoConfiguracaoPluggy
      && !this.erroCarregamentoConexoesPluggy
      && !this.configuracaoPluggyAusente
      && this.conexoesPluggy.length > 0;
  }

  get textoBotaoConexaoPluggy(): string {
    if (this.salvandoConexao) return 'Salvando conexão...';
    if (this.conectandoBanco) return 'Abrindo autorização...';
    if (this.carregandoConfiguracaoPluggy) return 'Verificando credenciais Pluggy...';
    if (this.carregandoConexoesPluggy || !this.conexoesPluggyCarregadas) return 'Carregando conexões...';
    if (this.configuracaoPluggyAusente) return 'Configure as credenciais Pluggy';
    if (this.erroCarregamentoConexoesPluggy) return 'Recarregue as conexões';
    if (this.limiteConexoesAtingido) return 'Limite de 5 bancos atingido';
    return this.conexoesPluggy.length > 0 ? 'Adicionar banco' : 'Conectar banco';
  }

  rotuloStatusConexao(conexao: PluggyConnection): string {
    if (this.autorizacaoExpirada(conexao)) return 'Autorização expirada';
    return {
      UPDATED: 'Atualizada',
      UPDATING: 'Atualizando',
      OUTDATED: 'Aguardando atualização',
      LOGIN_ERROR: 'Atenção necessária',
      WAITING_USER_INPUT: 'Atenção necessária',
      CREATED: 'Conectando',
    }[conexao.status] ?? 'Verificar conexão';
  }

  autorizacaoExpirada(conexao: PluggyConnection): boolean {
    return conexao.status === 'USER_AUTHORIZATION_EXPIRED'
      || (!!conexao.consentExpiresAt && new Date(conexao.consentExpiresAt).getTime() <= Date.now());
  }

  autorizacaoExpiraEmBreve(conexao: PluggyConnection): boolean {
    if (!conexao.consentExpiresAt || this.autorizacaoExpirada(conexao)) return false;
    const prazo = new Date(conexao.consentExpiresAt).getTime() - Date.now();
    return prazo <= 30 * 24 * 60 * 60 * 1000;
  }

  private mensagemErroPluggy(status: number | undefined, fallback: string, mensagemServidor?: string): string {
    if (status === 403) return 'Esta integração pessoal está disponível somente para o titular configurado.';
    if (status === 409) return 'A autorização Meu Pluggy expirou. Renove a autorização para consultar os dados novamente.';
    if (status === 503) return mensagemServidor?.trim() || 'O Meu Pluggy ainda não está configurado no servidor.';
    if (status === 502) return mensagemServidor?.trim() || 'O Meu Pluggy está indisponível no momento. Tente novamente mais tarde.';
    if (status === 401) return 'Sua sessão não foi aceita pela API. Entre novamente no YourMoney e tente de novo.';
    if (status === 0) return 'Não foi possível conectar à API do YourMoney. Verifique se o servidor local está ativo e tente novamente.';
    if (status === 500) return 'A API do YourMoney encontrou um erro interno (HTTP 500) ao consultar o Meu Pluggy.';
    return status ? `${fallback} (HTTP ${status}).` : fallback;
  }

  obterRotuloDirecao(direction: OpenFinanceTransactionPreview['direction']): string {
    return direction === 'inflow' ? 'Entrada' : 'Saída';
  }

  obterRotuloClassificacao(tipo: OpenFinanceSuggestedFinancialType): string {
    return { receita: 'Receita', despesa: 'Despesa', unknown: 'A revisar' }[tipo];
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
