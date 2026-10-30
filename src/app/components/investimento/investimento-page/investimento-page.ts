import { CommonModule } from '@angular/common';
import { Component, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import {
  AtualizarInvestimentoRequest,
  CriarInvestimentoRequest,
  Investimento,
  InvestimentoService
} from '../../../services/investimento';
import { AuthService } from '../../../services/auth.service';
import { ReceitaRecorrenteService } from '../../../services/receita-recorrente';
import { FiltroOrganizacaoInvestimentos, ReservaSalarial, SubtotalGrupoInvestimento, SubtotalTipoAtivoInvestimento, TIPOS_ATIVO, TipoAtivoCodigo } from '../../../models/investimento.model';
import { GrupoObjetivoInvestimento, GrupoObjetivoResumo } from '../../../models/investimento-grupo.model';
import { imagemSugeridaObjetivo, resolverImagemObjetivo } from '../../../models/objetivo-imagem';
import { SalarioElegivelInvestimento } from '../../../models/receita-recorrente.model';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ViewStateComponent } from '../../shared/view-state/view-state';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';
import { InvestimentoGrupoService } from '../../../services/investimento-grupo';
import { FeedbackService } from '../../../services/feedback.service';
import { GrupoObjetivoDialogComponent } from '../grupo-objetivo-dialog/grupo-objetivo-dialog';
import { FinancialValuePipe } from '../../../pipes/financial-value.pipe';
import { FinancialValueInputDirective } from '../../../directives/financial-value-input.directive';
import { OpenFinanceService } from '../../../services/openfinance';
import {
  PluggyDuplicateCandidate,
  PluggyTransactionPreview,
  PluggyInvestmentReconciliationRequest,
  PluggyInvestmentAsset,
  PluggyInvestmentAssetCandidate,
  PluggyInvestmentAssetsOverview,
  PluggyInvestmentAssetReconciliationRequest
} from '../../../models/pluggy.model';

interface InvestimentoForm {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  precoMedio: number;
  valorAtual: number;
  dataInvestimento: string;
  mesReferencia: string;
  receitaRecorrenteId: string | null;
  operacaoId: string;
  grupoObjetivoId: string | null;
  tipoAtivo: TipoAtivoCodigo | null;
  codigoAtivo: string;
  isin: string;
  precoUnitarioAtual: number | null;
}

interface OpcaoReserva extends SalarioElegivelInvestimento {
  historica?: boolean;
}

@Component({
  selector: 'app-investimento-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FinancialValuePipe, FinancialValueInputDirective, PageHeaderComponent, ViewStateComponent, GrupoObjetivoDialogComponent],
  templateUrl: './investimento-page.html',
  styleUrls: ['./investimento-page.scss']
})
export class InvestimentoPageComponent implements OnDestroy {
  @ViewChild(GrupoObjetivoDialogComponent) grupoDialog?: GrupoObjetivoDialogComponent;
  private destroy$ = new Subject<void>();
  private revisaoConsulta = 0;

  investimentos: Investimento[] = [];
  reservas: ReservaSalarial[] = [];
  salariosElegiveis: OpcaoReserva[] = [];
  totalInvestimentos = 0;
  totalFiltrado = 0;
  grupos: GrupoObjetivoInvestimento[] = [];
  objetivosResumo: GrupoObjetivoResumo[] = [];
  private subobjetivosExpandidos = new Set<string>();
  subtotaisPorGrupo: SubtotalGrupoInvestimento[] = [];
  subtotaisPorTipoAtivo: SubtotalTipoAtivoInvestimento[] = [];
  filtroGrupo = 'todos';
  filtroTipo = 'todos';
  readonly tiposAtivo = TIPOS_ATIVO;
  estadoCarregamento: FinancialViewState = 'loading';
  salvandoInvestimento = false;
  editando = false;
  carregandoSalarios = false;
  novoInvestimento = this.criarFormularioVazio();
  mostrarTransacoesOpenFinance = false;
  carregandoOpenFinance = false;
  erroOpenFinance: string | null = null;
  erroReconciliacaoOpenFinance: string | null = null;
  semConexaoOpenFinance = false;
  periodoOpenFinanceForaDaJanela = false;
  transacoesOpenFinance: PluggyTransactionPreview[] = [];
  revisaoSubstituicao: {
    transacao: PluggyTransactionPreview;
    candidata: PluggyDuplicateCandidate;
    descricao: string;
    valor: number;
    data: string;
  } | null = null;
  transacaoOpenFinanceParaCadastro: PluggyTransactionPreview | null = null;
  private confirmarDuplicidadeOpenFinance = false;
  private revisaoOpenFinance = 0;
  salvandoOpenFinance = false;
  mostrarAtivosOpenFinance = false;
  ativosOpenFinanceOverview: PluggyInvestmentAssetsOverview | null = null;
  ativoOpenFinanceContext: {
    ativo: PluggyInvestmentAsset;
    action: 'create' | 'replace';
    candidata?: PluggyInvestmentAssetCandidate;
  } | null = null;

  get estadoCompartilhado(): FinancialViewState { return this.estadoCarregamento; }
  get mensagemEstado(): string {
    return financialStateMessage(this.estadoCompartilhado, this.financialContext.period().date, 'investimentos');
  }

  constructor(
    private investimentoService: InvestimentoService,
    private receitaRecorrenteService: ReceitaRecorrenteService,
    private authService: AuthService,
    private router: Router,
    private financialContext: FinancialNavigationContextService = new FinancialNavigationContextService(),
    private investimentoGrupoService: InvestimentoGrupoService = undefined!,
    private feedbackService: FeedbackService = new FeedbackService(),
    private openFinanceService: OpenFinanceService = undefined!
  ) {
    this.carregarGrupos();
    this.carregarResumoObjetivos();
    this.carregarInvestimentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarInvestimentos(): void {
    const revisao = ++this.revisaoConsulta;
    const tinhaDados = this.investimentos.length > 0;
    this.estadoCarregamento = tinhaDados ? 'refreshing' : 'loading';

    this.investimentoService.obterConsolidado(this.montarFiltro())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: carteira => {
          if (revisao !== this.revisaoConsulta) return;
          this.investimentos = carteira.itens;
          this.reservas = carteira.reservas;
          this.totalInvestimentos = carteira.totalInvestido;
          this.totalFiltrado = carteira.totalFiltrado ?? carteira.totalInvestido;
          this.subtotaisPorGrupo = this.adicionarPercentuaisObjetivos(carteira.subtotaisPorGrupo ?? []);
          this.subtotaisPorTipoAtivo = carteira.subtotaisPorTipoAtivo ?? [];
          this.estadoCarregamento = carteira.itens.length > 0 ? 'loadedWithData' : (this.filtrosAtivos ? 'emptyFilter' : 'emptyPeriod');
        },
        error: erro => {
          if (revisao !== this.revisaoConsulta) return;
          console.error('Erro ao carregar investimentos', erro);
          this.estadoCarregamento = tinhaDados ? 'stale' : 'loadError';
        }
      });
  }

  alternarOpenFinance(ativo: boolean): void {
    this.mostrarTransacoesOpenFinance = ativo;
    if (ativo) {
      this.carregarTransacoesOpenFinance();
      return;
    }
    ++this.revisaoOpenFinance;
    this.carregandoOpenFinance = false;
    this.erroOpenFinance = null;
    this.erroReconciliacaoOpenFinance = null;
    this.semConexaoOpenFinance = false;
    this.periodoOpenFinanceForaDaJanela = false;
    this.transacoesOpenFinance = [];
    this.revisaoSubstituicao = null;
  }

  alternarAtivosOpenFinance(ativo: boolean): void {
    this.mostrarAtivosOpenFinance = ativo;
    if (ativo) {
      this.carregarAtivosOpenFinance();
      return;
    }
    ++this.revisaoOpenFinance;
    this.carregandoOpenFinance = false;
    this.erroOpenFinance = null;
    this.erroReconciliacaoOpenFinance = null;
    this.ativosOpenFinanceOverview = null;
    this.ativoOpenFinanceContext = null;
  }

  carregarAtivosOpenFinance(connectionId?: string, retryFailed = false): void {
    if (!this.mostrarAtivosOpenFinance || !this.openFinanceService) return;
    const revisao = ++this.revisaoOpenFinance;
    this.carregandoOpenFinance = true;
    this.erroOpenFinance = null;
    this.openFinanceService.obterAtivosInvestimentoPluggy(connectionId, retryFailed)
      .pipe(takeUntil(this.destroy$), finalize(() => {
        if (revisao === this.revisaoOpenFinance) this.carregandoOpenFinance = false;
      }))
      .subscribe({
        next: overview => {
          if (revisao !== this.revisaoOpenFinance || !this.mostrarAtivosOpenFinance) return;
          if (!overview || !Array.isArray(overview.connections) || !Array.isArray(overview.assets)) {
            this.ativosOpenFinanceOverview = null;
            this.erroOpenFinance = 'A API local devolveu um formato de dados inválido para os ativos. Reinicie a API atualizada e tente novamente.';
            return;
          }
          const anterior = this.ativosOpenFinanceOverview;
          const resultado = connectionId && anterior
            ? {
              ...overview,
              connections: [
                ...anterior.connections.filter(connection => connection.connectionId !== connectionId),
                ...overview.connections
              ],
              assets: [
                ...anterior.assets.filter(asset => asset.connectionId !== connectionId),
                ...overview.assets
              ]
            }
            : overview;
          this.ativosOpenFinanceOverview = resultado;
          this.semConexaoOpenFinance = resultado.connections.length === 0;
        },
        error: erro => {
          if (revisao !== this.revisaoOpenFinance) return;
          this.ativosOpenFinanceOverview = null;
          this.erroOpenFinance = this.mensagemErroOpenFinance(erro);
        }
      });
  }

  async vincularAtivoOpenFinance(ativo: PluggyInvestmentAsset, candidata: PluggyInvestmentAssetCandidate): Promise<void> {
    const confirmado = await this.feedbackService.confirm({
      kind: 'confirmation',
      title: 'Manter investimento e vincular?',
      message: `“${candidata.name}” será mantido como está e associado à posição de ${ativo.name}.`,
      confirmLabel: 'Manter e vincular'
    });
    if (!confirmado) return;
    this.enviarReconciliacaoAtivoOpenFinance({
      connectionId: ativo.connectionId,
      externalInvestmentId: ativo.investmentId,
      snapshotToken: ativo.snapshotToken,
      action: 'link',
      targetInvestmentId: candidata.investmentId
    });
  }

  async abrirCadastroAtivoOpenFinance(ativo: PluggyInvestmentAsset): Promise<void> {
    if (!ativo.canReconcile || ativo.linkedInvestmentId) return;
    if (ativo.candidates.length) {
      const confirmado = await this.feedbackService.confirm({
        kind: 'confirmation',
        title: 'Cadastrar novo ativo?',
        message: `Encontramos possíveis correspondências para “${ativo.name}”. Confira se ele já existe antes de criar outro.`,
        confirmLabel: 'Revisar e cadastrar'
      });
      if (!confirmado) return;
    }
    this.abrirFormularioAtivoOpenFinance(ativo, 'create');
  }

  abrirSubstituicaoAtivoOpenFinance(ativo: PluggyInvestmentAsset, candidata: PluggyInvestmentAssetCandidate): void {
    if (!ativo.canReconcile || !candidata.canReplace) return;
    this.abrirFormularioAtivoOpenFinance(ativo, 'replace', candidata);
  }

  cancelarCadastroOpenFinance(): void {
    this.ativoOpenFinanceContext = null;
    this.transacaoOpenFinanceParaCadastro = null;
    this.confirmarDuplicidadeOpenFinance = false;
    this.erroReconciliacaoOpenFinance = null;
  }

  private abrirFormularioAtivoOpenFinance(
    ativo: PluggyInvestmentAsset,
    action: 'create' | 'replace',
    candidata?: PluggyInvestmentAssetCandidate
  ): void {
    this.erroReconciliacaoOpenFinance = null;
    this.ativoOpenFinanceContext = { ativo, action, candidata };
    this.transacaoOpenFinanceParaCadastro = null;
    this.editando = false;
    const dataCompra = ativo.purchaseDate ? this.dataCivilOpenFinance(ativo.purchaseDate) : '';
    const mesAtual = new Date().toISOString().substring(0, 7);
    const quantidade = ativo.quantity ?? candidata?.quantidade ?? 0;
    const precoMedioSugerido = ativo.originalAmount && ativo.quantity
      ? ativo.originalAmount / ativo.quantity
      : candidata?.precoMedio ?? 0;
    this.novoInvestimento = {
      ...this.criarFormularioVazio(),
      id: action === 'replace' ? candidata?.investmentId ?? '' : '',
      nome: ativo.name,
      descricao: action === 'replace' ? ativo.name : ativo.name,
      tipo: ativo.subtype || ativo.type || candidata?.type || '',
      quantidade,
      precoMedio: precoMedioSugerido,
      valorAtual: ativo.balance,
      codigoAtivo: ativo.code ?? candidata?.code ?? '',
      isin: ativo.isin ?? candidata?.isin ?? '',
      precoUnitarioAtual: ativo.currentUnitQuote,
      dataInvestimento: action === 'replace' && !dataCompra && candidata?.dataInvestimento
        ? candidata.dataInvestimento.substring(0, 10) : dataCompra,
      mesReferencia: action === 'replace' && candidata?.mesReferencia
        ? candidata.mesReferencia.substring(0, 7) : dataCompra ? dataCompra.substring(0, 7) : mesAtual,
      receitaRecorrenteId: candidata?.receitaRecorrenteId ?? null,
      grupoObjetivoId: candidata?.grupoObjetivoId ?? null,
      tipoAtivo: (candidata?.tipoAtivo as TipoAtivoCodigo | null) ?? null
    };
    this.carregarSalariosElegiveis();
    this.mostrarModal(document.getElementById('modalInvestimento'));
  }

  private enviarReconciliacaoAtivoOpenFinance(request: PluggyInvestmentAssetReconciliationRequest): void {
    if (!this.openFinanceService || this.salvandoOpenFinance) return;
    this.salvandoOpenFinance = true;
    this.erroReconciliacaoOpenFinance = null;
    this.openFinanceService.reconciliarAtivoInvestimentoPluggy(request)
      .pipe(takeUntil(this.destroy$), finalize(() => this.salvandoOpenFinance = false))
      .subscribe({
        next: () => {
          this.cancelarCadastroOpenFinance();
          if (request.action !== 'link') {
            this.fecharModal();
            this.carregarInvestimentos();
          }
          this.carregarAtivosOpenFinance();
          void this.feedbackService.success(
            request.action === 'link' ? 'Ativo vinculado'
              : request.action === 'replace' ? 'Investimento atualizado' : 'Investimento cadastrado',
            request.action === 'link' ? 'O investimento local foi preservado.'
              : 'A posição revisada foi associada à carteira.'
          );
        },
        error: erro => {
          this.erroReconciliacaoOpenFinance = this.extrairMensagemErro(erro);
          if ((erro as HttpErrorResponse)?.status === 409) this.carregarAtivosOpenFinance();
        }
      });
  }

  carregarTransacoesOpenFinance(): void {
    if (!this.mostrarTransacoesOpenFinance || !this.openFinanceService) return;
    const revisao = ++this.revisaoOpenFinance;
    const periodo = this.financialContext.period().date;
    const inicio = `${periodo.getFullYear()}-${String(periodo.getMonth() + 1).padStart(2, '0')}-01`;
    const ultimoDia = new Date(periodo.getFullYear(), periodo.getMonth() + 1, 0).getDate();
    const fim = `${periodo.getFullYear()}-${String(periodo.getMonth() + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    this.periodoOpenFinanceForaDaJanela = new Date(`${fim}T23:59:59`) < limite;
    this.carregandoOpenFinance = true;
    this.erroOpenFinance = null;
    this.semConexaoOpenFinance = false;
    this.openFinanceService.obterVisaoGeralPluggy({ from: inicio, to: fim, targetType: 'investment' })
      .pipe(takeUntil(this.destroy$), finalize(() => {
        if (revisao === this.revisaoOpenFinance) this.carregandoOpenFinance = false;
      }))
      .subscribe({
        next: overview => {
          if (revisao !== this.revisaoOpenFinance || !this.mostrarTransacoesOpenFinance) return;
          this.semConexaoOpenFinance = overview.accounts.length === 0;
          this.transacoesOpenFinance = overview.transactions;
          this.revisaoSubstituicao = null;
        },
        error: erro => {
          if (revisao !== this.revisaoOpenFinance) return;
          this.transacoesOpenFinance = [];
          this.erroOpenFinance = this.mensagemErroOpenFinance(erro);
        }
      });
  }

  private mensagemErroOpenFinance(erro: unknown): string {
    const http = erro as HttpErrorResponse & { error?: { code?: string; message?: string } };
    if (http.status === 200 && http.error instanceof SyntaxError) {
      return 'O servidor local devolveu a página web no lugar dos dados. Reinicie a API local atualizada e tente novamente.';
    }
    if (http.status === 404 && http.error?.code === 'api_route_not_found') {
      return 'A API local não reconheceu a rota de ativos. Reinicie a API local atualizada e tente novamente.';
    }
    if (http.status === 503 && http.error?.code === 'schema_migration_required') {
      return http.error.message ?? 'O banco precisa da migration OpenFinanceInvestmentAssets para consultar posições.';
    }
    if (http.status === 503) return 'Meu Pluggy ainda não está configurado no servidor. Peça a configuração e tente novamente.';
    if (http.status === 409) return 'A autorização do banco expirou. Renove o acesso na área Open Finance e atualize as posições.';
    if (http.status === 403) return 'A autorização não permite consultar estas posições de investimento. Verifique a conexão do banco.';
    if ([0, 502, 504].includes(http.status)) return 'Não foi possível consultar as posições de investimento agora. Tente novamente em instantes.';
    return http.error?.message ?? 'Não foi possível carregar as posições de investimento Open Finance.';
  }

  podeTentarNovamenteAtivosOpenFinance(conexao: { retryAfterAt?: string | null }): boolean {
    if (this.carregandoOpenFinance) return false;
    if (!conexao.retryAfterAt) return true;
    const retryAfter = new Date(conexao.retryAfterAt).getTime();
    return !Number.isFinite(retryAfter) || Date.now() >= retryAfter;
  }

  formatarDataHoraOpenFinance(valor: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short'
    }).format(new Date(valor));
  }

  mensagemFalhaAtivosOpenFinance(conexao: { lastSuccessAt: string | null; message: string | null }): string {
    if (conexao.message) return conexao.message;
    return conexao.lastSuccessAt
      ? 'A consulta falhou. As últimas posições válidas continuam visíveis como desatualizadas.'
      : 'A consulta falhou e ainda não há posições válidas para exibir.';
  }

  valorTransacaoOpenFinance(transacao: PluggyTransactionPreview): number {
    return transacao.suggestedAmountBrl ?? Math.abs(transacao.amount);
  }

  dataCivilOpenFinance(data: string | null | undefined): string {
    if (!data) return '';
    const instante = new Date(data);
    if (!Number.isFinite(instante.getTime())) return '';
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(instante);
    const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find(parte => parte.type === tipo)?.value ?? '';
    return `${valor('year')}-${valor('month')}-${valor('day')}`;
  }

  async vincularTransacaoOpenFinance(
    transacao: PluggyTransactionPreview,
    candidata: PluggyDuplicateCandidate
  ): Promise<void> {
    const confirmado = await this.feedbackService.confirm({
      kind: 'confirmation',
      title: 'Manter investimento e vincular?',
      message: `O investimento “${candidata.name || candidata.description}” não será alterado. A transação bancária será associada a ele.`,
      confirmLabel: 'Manter e vincular'
    });
    if (!confirmado) return;
    this.enviarReconciliacaoOpenFinance({
      transactionId: transacao.transactionId,
      action: 'link',
      targetInvestmentId: candidata.recordId,
      expectedDescription: candidata.description,
      expectedAmount: candidata.amount,
      expectedDate: candidata.date
    });
  }

  abrirSubstituicaoOpenFinance(transacao: PluggyTransactionPreview, candidata: PluggyDuplicateCandidate): void {
    if (!candidata.canReplace) return;
    this.revisaoSubstituicao = {
      transacao,
      candidata,
      descricao: transacao.description,
      valor: this.valorTransacaoOpenFinance(transacao),
      data: this.dataCivilOpenFinance(transacao.date)
    };
  }

  cancelarSubstituicaoOpenFinance(): void { this.revisaoSubstituicao = null; }

  async confirmarSubstituicaoOpenFinance(): Promise<void> {
    const revisao = this.revisaoSubstituicao;
    if (!revisao || revisao.valor <= 0 || !revisao.descricao.trim() || !revisao.data) return;
    const confirmado = await this.feedbackService.confirm({
      kind: 'confirmation',
      title: 'Substituir dados do investimento?',
      message: 'A descrição, a data e o valor atual serão atualizados. Quantidade, preço médio e classificações serão preservados.',
      confirmLabel: 'Revisar e substituir'
    });
    if (!confirmado) return;
    this.enviarReconciliacaoOpenFinance({
      transactionId: revisao.transacao.transactionId,
      action: 'replace',
      targetInvestmentId: revisao.candidata.recordId,
      expectedDescription: revisao.candidata.description,
      expectedAmount: revisao.candidata.amount,
      expectedDate: revisao.candidata.date,
      description: revisao.descricao.trim(),
      amount: revisao.valor,
      date: revisao.data
    });
  }

  async abrirCadastroOpenFinance(transacao: PluggyTransactionPreview): Promise<void> {
    if (!transacao.importable || transacao.registrationStatus === 'REGISTERED') return;
    this.erroReconciliacaoOpenFinance = null;
    const candidatas = transacao.possibleDuplicateCandidates ?? [];
    let confirmouDuplicidade = false;
    if (candidatas.length > 0) {
      confirmouDuplicidade = await this.feedbackService.confirm({
        kind: 'confirmation',
        title: 'Cadastrar outro investimento?',
        message: 'Há possíveis correspondências na sua carteira. Confirme que esta transação representa um investimento separado.',
        confirmLabel: 'Cadastrar outro'
      });
      if (!confirmouDuplicidade) return;
    }

    const descricao = transacao.description.trim();
    const data = this.dataCivilOpenFinance(transacao.date);
    this.transacaoOpenFinanceParaCadastro = transacao;
    this.confirmarDuplicidadeOpenFinance = confirmouDuplicidade;
    this.editando = false;
    this.novoInvestimento = {
      ...this.criarFormularioVazio(),
      nome: descricao,
      descricao,
      valorAtual: this.valorTransacaoOpenFinance(transacao),
      dataInvestimento: data,
      mesReferencia: data.slice(0, 7)
    };
    this.carregarSalariosElegiveis();
    this.mostrarModal(document.getElementById('modalInvestimento'));
  }

  private enviarReconciliacaoOpenFinance(request: PluggyInvestmentReconciliationRequest): void {
    if (!this.openFinanceService || this.salvandoOpenFinance) return;
    this.salvandoOpenFinance = true;
    this.erroOpenFinance = null;
    this.erroReconciliacaoOpenFinance = null;
    this.openFinanceService.reconciliarInvestimentoPluggy(request)
      .pipe(takeUntil(this.destroy$), finalize(() => this.salvandoOpenFinance = false))
      .subscribe({
        next: _result => {
          this.revisaoSubstituicao = null;
          this.transacaoOpenFinanceParaCadastro = null;
          this.confirmarDuplicidadeOpenFinance = false;
          this.erroReconciliacaoOpenFinance = null;
          if (request.action === 'create') this.fecharModal();
          if (request.action !== 'link') this.carregarInvestimentos();
          this.carregarTransacoesOpenFinance();
          void this.feedbackService.success(
            request.action === 'link' ? 'Investimento vinculado' : request.action === 'replace' ? 'Investimento atualizado' : 'Investimento cadastrado',
            request.action === 'link'
              ? 'A transação foi vinculada à posição existente.'
              : request.action === 'replace'
                ? 'Os dados revisados foram atualizados e a transação foi vinculada.'
                : 'O investimento foi cadastrado com os dados revisados da transação.'
          );
        },
        error: erro => {
          this.erroReconciliacaoOpenFinance = this.extrairMensagemErro(erro);
          if ((erro as HttpErrorResponse)?.status === 409) this.carregarTransacoesOpenFinance();
        }
      });
  }

  private adicionarPercentuaisObjetivos(subtotais: SubtotalGrupoInvestimento[]): SubtotalGrupoInvestimento[] {
    const total = subtotais.reduce((soma, subtotal) => soma + subtotal.valorAtual, 0);
    if (total <= 0) return subtotais.map(subtotal => ({ ...subtotal, percentual: 0 }));

    const partes = subtotais.map((subtotal, indice) => {
      const decimosExatos = subtotal.valorAtual / total * 1000;
      const decimosInteiros = Math.floor(decimosExatos);
      return { indice, decimosInteiros, resto: decimosExatos - decimosInteiros };
    });
    let decimosRestantes = 1000 - partes.reduce((soma, parte) => soma + parte.decimosInteiros, 0);
    const porMaiorResto = [...partes].sort((a, b) => b.resto - a.resto || a.indice - b.indice);
    for (let indice = 0; indice < decimosRestantes; indice++)
      porMaiorResto[indice % porMaiorResto.length].decimosInteiros++;

    const percentuais = new Map(partes.map(parte => [parte.indice, parte.decimosInteiros / 10]));
    return subtotais.map((subtotal, indice) => ({ ...subtotal, percentual: percentuais.get(indice) ?? 0 }));
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  abrirModalInvestimento(): void {
    this.ativoOpenFinanceContext = null;
    this.transacaoOpenFinanceParaCadastro = null;
    this.confirmarDuplicidadeOpenFinance = false;
    this.editando = false;
    this.novoInvestimento = this.criarFormularioVazio();
    this.carregarSalariosElegiveis();
    const modalElement = document.getElementById('modalInvestimento');
    this.mostrarModal(modalElement);
  }

  abrirModalEditar(investimento: Investimento): void {
    this.ativoOpenFinanceContext = null;
    this.transacaoOpenFinanceParaCadastro = null;
    this.confirmarDuplicidadeOpenFinance = false;
    this.editando = true;
    this.novoInvestimento = {
      ...investimento,
      dataInvestimento: investimento.dataInvestimento.substring(0, 10),
      mesReferencia: (investimento.mesReferencia ?? investimento.dataInvestimento).substring(0, 7),
      codigoAtivo: investimento.codigoAtivo ?? '',
      isin: investimento.isin ?? '',
      precoUnitarioAtual: investimento.precoUnitarioAtual ?? null,
      receitaRecorrenteId: investimento.receitaRecorrenteId ?? null,
      grupoObjetivoId: investimento.grupoObjetivoId ?? null,
      tipoAtivo: investimento.tipoAtivo ?? null,
      operacaoId: ''
    };
    this.carregarSalariosElegiveis(investimento);
    const modalElement = document.getElementById('modalInvestimento');
    this.mostrarModal(modalElement);
  }

  salvarInvestimento(): void {
    if (this.salvandoInvestimento || this.salvandoOpenFinance) {
      return;
    }

    const mensagemValidacao = this.validarFormulario();
    if (mensagemValidacao) {
      this.mostrarAviso(mensagemValidacao);
      return;
    }

    if (this.ativoOpenFinanceContext) {
      const contexto = this.ativoOpenFinanceContext;
      const request: PluggyInvestmentAssetReconciliationRequest = {
        connectionId: contexto.ativo.connectionId,
        externalInvestmentId: contexto.ativo.investmentId,
        snapshotToken: contexto.ativo.snapshotToken,
        action: contexto.action,
        targetInvestmentId: contexto.candidata?.investmentId,
        expectedLocalName: contexto.candidata?.name,
        expectedLocalValue: contexto.candidata?.valorAtual,
        investment: this.montarPayloadCriacao()
      };
      this.enviarReconciliacaoAtivoOpenFinance(request);
      return;
    }

    if (this.transacaoOpenFinanceParaCadastro) {
      const request: PluggyInvestmentReconciliationRequest = {
        transactionId: this.transacaoOpenFinanceParaCadastro.transactionId,
        action: 'create',
        investment: this.montarPayloadCriacao(),
        confirmPossibleDuplicate: this.confirmarDuplicidadeOpenFinance
      };
      this.enviarReconciliacaoOpenFinance(request);
      return;
    }

    const request$ = this.editando
      ? this.investimentoService.atualizarInvestimento(this.montarPayloadAtualizacao())
      : this.investimentoService.criarInvestimento(this.montarPayloadCriacao());

    this.salvandoInvestimento = true;
    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.salvandoInvestimento = false)
      )
      .subscribe({
        next: () => {
          this.fecharModal();
          this.carregarInvestimentos();
          this.mostrarSucesso();
        },
        error: erro => {
          console.error('Erro ao salvar investimento', erro);
          this.mostrarErro(erro);
        }
      });
  }

  deletarInvestimento(id: string): void {
    this.feedbackService.confirm({ kind: 'confirmation', title: 'Excluir investimento?', message: 'Esta ação não pode ser desfeita.', destructive: true }).then(confirmado => {
      if (!confirmado) return;

      this.investimentoService.deletarInvestimento(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.carregarInvestimentos();
            void this.feedbackService.success('Investimento excluído');
          },
          error: () => void this.feedbackService.error('Não foi possível excluir o investimento')
        });
    });
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  formatarValorAtivo(valor: number, moeda: string): string {
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency', currency: moeda || 'BRL', maximumFractionDigits: 8
      }).format(valor);
    } catch {
      return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 }).format(valor)} ${moeda || ''}`.trim();
    }
  }

  rotuloEstadoAtivos(status: string): string {
    switch (status) {
      case 'current': return 'dados atualizados';
      case 'empty': return 'sem posições';
      case 'no_product': return 'produto de investimentos indisponível';
      case 'stale': return 'última consulta com falha';
      case 'configuration_required': return 'configuração necessária';
      case 'loading': return 'consultando';
      default: return 'aguardando consulta';
    }
  }

  rotuloSituacaoAtivo(status: string | null): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'Ativo';
      case 'PENDING': return 'Pendente';
      case 'TOTAL_WITHDRAWAL': return 'Resgatado totalmente';
      default: return status || 'Posição recebida';
    }
  }

  hasConnectionErrorOpenFinance(overview: PluggyInvestmentAssetsOverview): boolean {
    return overview.connections.some(connection =>
      connection.status === 'stale' || connection.status === 'configuration_required');
  }

  private criarFormularioVazio(): InvestimentoForm {
    return {
      id: '',
      nome: '',
      descricao: '',
      tipo: '',
      quantidade: 0,
      precoMedio: 0,
      valorAtual: 0,
      codigoAtivo: '',
      isin: '',
      precoUnitarioAtual: null,
      dataInvestimento: this.dataLocalHoje(),
      mesReferencia: this.mesLocalAtual(),
      receitaRecorrenteId: null,
      grupoObjetivoId: null,
      tipoAtivo: null,
      operacaoId: this.novaOperacaoId()
    };
  }

  private montarPayloadCriacao(): CriarInvestimentoRequest {
    return {
      nome: this.novoInvestimento.nome.trim(),
      descricao: this.novoInvestimento.descricao.trim(),
      tipo: this.novoInvestimento.tipo.trim(),
      quantidade: this.novoInvestimento.quantidade,
      precoMedio: this.novoInvestimento.precoMedio,
      codigoAtivo: this.novoInvestimento.codigoAtivo.trim() || null,
      isin: this.novoInvestimento.isin.trim() || null,
      precoUnitarioAtual: this.novoInvestimento.precoUnitarioAtual,
      valorAtual: this.novoInvestimento.valorAtual,
      dataInvestimento: this.novoInvestimento.dataInvestimento,
      mesReferencia: `${this.novoInvestimento.mesReferencia}-01`,
      receitaRecorrenteId: this.novoInvestimento.receitaRecorrenteId || null,
      grupoObjetivoId: this.novoInvestimento.grupoObjetivoId || null,
      tipoAtivo: this.novoInvestimento.tipoAtivo || null,
      operacaoId: this.novoInvestimento.operacaoId
    };
  }

  private montarPayloadAtualizacao(): AtualizarInvestimentoRequest {
    const { operacaoId: _, ...payload } = this.montarPayloadCriacao();
    return {
      ...payload,
      id: this.novoInvestimento.id
    };
  }

  private validarFormulario(): string | null {
    if (!this.novoInvestimento.nome.trim()) return 'Informe o nome do investimento.';
    if (this.novoInvestimento.nome.trim().length > 100) return 'O nome deve ter no máximo 100 caracteres.';
    if (!this.novoInvestimento.descricao.trim()) return 'Informe a descrição do investimento.';
    if (this.novoInvestimento.descricao.trim().length > 500) return 'A descrição deve ter no máximo 500 caracteres.';
    if (!this.novoInvestimento.tipo.trim()) return 'Informe o tipo do investimento.';
    if (this.novoInvestimento.tipo.trim().length > 100) return 'O tipo deve ter no máximo 100 caracteres.';
    if (this.novoInvestimento.quantidade <= 0) return 'A quantidade deve ser maior que zero.';
    if (this.novoInvestimento.precoMedio <= 0) return 'O preço médio deve ser maior que zero.';
    if (this.novoInvestimento.valorAtual <= 0) return 'O valor atual deve ser maior que zero.';
    if (!this.novoInvestimento.dataInvestimento) return 'Informe a data do investimento.';
    if (!this.novoInvestimento.mesReferencia) return 'Informe o mês de referência.';
    return null;
  }

  formatarPercentual(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor) + '%';
  }

  larguraProgresso(valor: number): number {
    return Math.min(Math.max(valor, 0), 100);
  }

  imagemObjetivo(objetivo: GrupoObjetivoResumo): string | null {
    return resolverImagemObjetivo(objetivo.imagemUrl) ?? imagemSugeridaObjetivo(objetivo.nome, objetivo.descricao);
  }

  nomeGrupoObjetivo(grupo: GrupoObjetivoInvestimento): string {
    const pai = this.grupos.find(item => item.id === grupo.grupoPaiId);
    return pai ? `${pai.nome} › ${grupo.nome}` : grupo.nome;
  }

  valorRestanteObjetivo(objetivo: GrupoObjetivoResumo): number {
    return Math.max((objetivo.valorAlvo ?? 0) - objetivo.valorAtualCarteira, 0);
  }

  objetivosPrincipais(): GrupoObjetivoResumo[] {
    return this.objetivosResumo.filter(objetivo => !objetivo.grupoPaiId);
  }

  subobjetivosDe(objetivoId: string): GrupoObjetivoResumo[] {
    return this.objetivosResumo.filter(objetivo => objetivo.grupoPaiId === objetivoId);
  }

  subobjetivosAbertos(objetivoId: string): boolean {
    return this.subobjetivosExpandidos.has(objetivoId);
  }

  alternarSubobjetivos(objetivoId: string): void {
    const atualizados = new Set(this.subobjetivosExpandidos);
    if (atualizados.has(objetivoId)) atualizados.delete(objetivoId);
    else atualizados.add(objetivoId);
    this.subobjetivosExpandidos = atualizados;
  }

  formatarDataCivil(valor: string | null | undefined): string {
    if (!valor) return 'Não informada';
    const [ano, mes, dia] = valor.substring(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  private carregarSalariosElegiveis(investimentoHistorico?: Investimento): void {
    this.carregandoSalarios = true;
    this.salariosElegiveis = [];
    this.receitaRecorrenteService.listarElegiveisParaInvestimento()
      .pipe(takeUntil(this.destroy$), finalize(() => this.carregandoSalarios = false))
      .subscribe({
        next: resposta => {
          this.salariosElegiveis = resposta.itens;
          this.incluirOpcaoHistorica(investimentoHistorico);
        },
        error: () => this.incluirOpcaoHistorica(investimentoHistorico)
      });
  }

  private incluirOpcaoHistorica(investimento?: Investimento): void {
    if (!investimento?.receitaRecorrenteId || !investimento.reservaAssociada) return;
    if (this.salariosElegiveis.some(item => item.id === investimento.receitaRecorrenteId)) return;
    this.salariosElegiveis.unshift({
      id: investimento.receitaRecorrenteId,
      descricao: investimento.reservaAssociada.descricao,
      contaDescricao: investimento.reservaAssociada.contaDescricao,
      valorPrevisto: 0,
      historica: true
    });
  }

  private novaOperacaoId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private mostrarAviso(mensagem: string): void {
    void this.feedbackService.warning('Revise os dados', mensagem);
  }

  private mostrarSucesso(): void {
    void this.feedbackService.success(this.editando ? 'Investimento atualizado!' : 'Investimento cadastrado!', this.editando
        ? 'Seu investimento foi atualizado com sucesso.'
        : 'Seu investimento foi registrado com sucesso.');
  }

  private mostrarErro(erro: unknown): void {
    void this.feedbackService.error('Não foi possível salvar', this.extrairMensagemErro(erro));
  }

  private extrairMensagemErro(erro: unknown): string {
    const httpError = erro as HttpErrorResponse & {
      error?: {
        message?: string;
        title?: string;
        errors?: Record<string, string[]>;
      };
    };

    if (httpError.status === 401) return 'Sessão expirada. Faça login novamente.';
    if (httpError.status === 403) return 'Você não tem permissão para cadastrar este investimento.';
    if (httpError.status === 409) return 'Esta operação já foi enviada com dados diferentes. Reabra o cadastro e tente novamente.';
    if ([0, 502, 503, 504].includes(httpError.status)) {
      return 'Serviço temporariamente indisponível. Tente novamente.';
    }

    const validationMessages = httpError.error?.errors
      ? Object.values(httpError.error.errors).flat()
      : [];

    return validationMessages.join(', ') ||
      httpError.error?.message ||
      httpError.error?.title ||
      'Não foi possível salvar o investimento. Revise os dados e tente novamente.';
  }

  private fecharModal(): void {
    const modal = document.getElementById('modalInvestimento');
    const bootstrapModal = (window as any).bootstrap?.Modal;
    if (bootstrapModal) bootstrapModal.getInstance(modal)?.hide();
    else if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  private mostrarModal(modal: HTMLElement | null): void {
    if (!modal) return;
    const bootstrapModal = (window as any).bootstrap?.Modal;
    if (bootstrapModal) new bootstrapModal(modal).show();
    else {
      modal.classList.add('show');
      modal.style.display = 'block';
      modal.removeAttribute('aria-hidden');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('role', 'dialog');
    }
  }

  private dataLocalHoje(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private mesLocalAtual(): string {
    return this.financialContext?.period().key ?? this.dataLocalHoje().substring(0, 7);
  }

  get filtrosAtivos(): boolean { return this.filtroGrupo !== 'todos' || this.filtroTipo !== 'todos'; }
  get gruposAtivos(): GrupoObjetivoInvestimento[] { return this.grupos.filter(grupo => grupo.ativo !== false); }

  aplicarFiltros(): void { this.carregarInvestimentos(); }

  limparFiltros(): void {
    this.filtroGrupo = 'todos';
    this.filtroTipo = 'todos';
    this.carregarInvestimentos();
  }

  abrirGerenciadorObjetivos(): void { this.grupoDialog?.abrir(); }

  objetivosAlterados(): void {
    this.carregarGrupos();
    this.carregarInvestimentos();
    this.carregarResumoObjetivos();
  }

  rotuloTipoAtivo(tipo: TipoAtivoCodigo | null | undefined): string {
    return this.tiposAtivo.find(item => item.codigo === tipo)?.nome ?? 'Não classificado';
  }

  private carregarGrupos(): void {
    if (!this.investimentoGrupoService) return;
    this.investimentoGrupoService.listar(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: grupos => this.grupos = grupos,
      error: () => this.grupos = []
    });
  }

  private carregarResumoObjetivos(): void {
    if (!this.investimentoGrupoService) return;
    const periodo = this.financialContext.period().date;
    this.investimentoGrupoService.resumo(periodo.getMonth() + 1, periodo.getFullYear())
      .pipe(takeUntil(this.destroy$)).subscribe({ next: itens => this.objetivosResumo = itens, error: () => this.objetivosResumo = [] });
  }

  private montarFiltro(): FiltroOrganizacaoInvestimentos {
    const filtro: FiltroOrganizacaoInvestimentos = {};
    if (this.filtroGrupo === 'semGrupo') filtro.semGrupo = true;
    else if (this.filtroGrupo !== 'todos') filtro.grupoObjetivoId = this.filtroGrupo;
    if (this.filtroTipo === 'naoClassificado') filtro.naoClassificado = true;
    else if (this.filtroTipo !== 'todos') filtro.tipoAtivo = this.filtroTipo as TipoAtivoCodigo;
    return filtro;
  }

}
