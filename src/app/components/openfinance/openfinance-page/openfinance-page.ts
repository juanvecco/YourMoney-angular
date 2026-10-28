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

type ViewState = 'loading' | 'loaded' | 'empty' | 'error';

@Component({
  selector: 'app-openfinance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FinancialValuePipe, RouterLink, PageHeaderComponent, ViewStateComponent],
  templateUrl: './openfinance-page.html',
  styleUrls: ['./openfinance-page.css'],
})
export class OpenFinancePageComponent implements OnInit {
  fontes: OpenFinanceSource[] = [];
  readiness: OpenFinanceReadiness | null = null;
  transacoes: OpenFinanceTransactionPreview[] = [];
  estadoFontes: ViewState = 'loading';
  estadoPreview: ViewState = 'loading';
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
  configuracaoPluggyVisivel = true;
  fonteSelecionada = 'mock-transactions';
  private fontesRevision = 0;
  private previewRevision = 0;
  private overviewRevision = 0;

  constructor(
    private readonly openFinanceService: OpenFinanceService,
    private readonly despesaService: DespesaService,
  ) {}

  ngOnInit(): void {
    this.carregarFontes();
    this.carregarPreview();
    this.carregarConfiguracaoCredenciaisPluggy();
    this.carregarDadosPluggy();
  }

  carregarConfiguracaoCredenciaisPluggy(): void {
    this.carregandoConfiguracaoPluggy = true;
    this.mensagemConfiguracaoPluggy = '';
    this.openFinanceService.obterConfiguracaoCredenciaisPluggy().subscribe({
      next: status => {
        this.configuracaoCredenciaisPluggy = status;
        this.carregandoConfiguracaoPluggy = false;
      },
      error: error => {
        this.carregandoConfiguracaoPluggy = false;
        if (error?.status === 403) {
          this.configuracaoPluggyVisivel = false;
          return;
        }
        this.mensagemConfiguracaoPluggy = error?.status === 503
          ? 'O titular desta integração ainda não foi configurado no servidor.'
          : 'Não foi possível consultar a configuração das credenciais Pluggy.';
      },
    });
  }

  salvarCredenciaisPluggy(): void {
    if (this.salvandoCredenciaisPluggy || !this.clientIdPluggy.trim() || !this.clientSecretPluggy) return;
    this.salvandoCredenciaisPluggy = true;
    this.mensagemConfiguracaoPluggy = '';
    this.openFinanceService.salvarConfiguracaoCredenciaisPluggy(
      this.clientIdPluggy.trim(),
      this.clientSecretPluggy,
    ).subscribe({
      next: status => {
        this.configuracaoCredenciaisPluggy = status;
        this.clientIdPluggy = '';
        this.clientSecretPluggy = '';
        this.salvandoCredenciaisPluggy = false;
        this.mensagemConfiguracaoPluggy = 'Credenciais validadas e salvas com proteção no servidor.';
      },
      error: error => {
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
    this.openFinanceService.verificarProvedor().subscribe({
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
    this.conectandoBanco = true;
    this.mensagemProvedor = '';
    this.openFinanceService.obterConnectToken(conexao?.id).subscribe({
      next: token => void this.abrirWidgetPluggy(token.accessToken, token.connectionId),
      error: error => {
        this.conectandoBanco = false;
        this.provedorDisponivel = false;
        this.mensagemProvedor = error?.status === 503
          ? 'O Meu Pluggy ainda não está configurado no servidor.'
          : error?.status === 409
            ? 'O limite gratuito de cinco conexões foi atingido.'
            : error?.status === 403
              ? 'Esta integração pessoal está disponível somente para o titular configurado.'
              : 'Não foi possível iniciar a conexão agora. Tente novamente.';
      },
    });
  }

  private async abrirWidgetPluggy(connectToken: string, connectionId?: string | null): Promise<void> {
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
            await firstValueFrom(this.openFinanceService.registrarConexao(data.item.id, connectionId));
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
    this.carregarConexoesPluggy();
    this.carregarContasDisponiveisPluggy();
    this.carregarVisaoGeralPluggy();
  }

  private carregarContasDisponiveisPluggy(): void {
    this.openFinanceService.obterContasPluggy().subscribe({
      next: contas => this.contasDisponiveisPluggy = contas,
      error: () => this.contasDisponiveisPluggy = this.visaoGeralPluggy?.accounts ?? [],
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
    this.carregandoConexoesPluggy = true;
    this.openFinanceService.obterConexoes().subscribe({
      next: conexoes => {
        this.conexoesPluggy = conexoes;
        this.carregandoConexoesPluggy = false;
      },
      error: error => {
        this.carregandoConexoesPluggy = false;
        this.conexoesPluggy = [];
        this.mensagemProvedor = this.mensagemErroPluggy(error?.status, 'Não foi possível carregar as conexões Meu Pluggy.');
      },
    });
  }

  carregarVisaoGeralPluggy(): void {
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
    }).subscribe({
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
        const mensagem = this.mensagemErroPluggy(error?.status, 'Não foi possível carregar o resumo do Meu Pluggy.');
        this.mensagemContasPluggy = mensagem;
        this.mensagemTransacoesPluggy = mensagem;
      },
    });
  }

  desconectarBanco(conexao: PluggyConnection): void {
    if (!window.confirm(`Remover a referência de ${conexao.institutionName} do YourMoney? Isso não revoga os consentimentos bancários no Meu Pluggy.`)) return;
    this.conexaoSendoRemovida = conexao.id;
    this.openFinanceService.removerConexao(conexao.id).subscribe({
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
        firstValueFrom(this.despesaService.listarContas()),
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
    this.openFinanceService.importarTransacaoPluggy(request).subscribe({
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

  autorizacaoExpirada(conexao: PluggyConnection): boolean {
    return conexao.status === 'USER_AUTHORIZATION_EXPIRED'
      || (!!conexao.consentExpiresAt && new Date(conexao.consentExpiresAt).getTime() <= Date.now());
  }

  autorizacaoExpiraEmBreve(conexao: PluggyConnection): boolean {
    if (!conexao.consentExpiresAt || this.autorizacaoExpirada(conexao)) return false;
    const prazo = new Date(conexao.consentExpiresAt).getTime() - Date.now();
    return prazo <= 30 * 24 * 60 * 60 * 1000;
  }

  private mensagemErroPluggy(status: number | undefined, fallback: string): string {
    if (status === 403) return 'Esta integração pessoal está disponível somente para o titular configurado.';
    if (status === 409) return 'A autorização Meu Pluggy expirou. Renove a autorização para consultar os dados novamente.';
    if (status === 503) return 'O Meu Pluggy ainda não está configurado no servidor.';
    if (status === 502) return 'O Meu Pluggy está indisponível no momento. Tente novamente mais tarde.';
    return fallback;
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
