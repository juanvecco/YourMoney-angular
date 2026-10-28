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
    private feedbackService: FeedbackService = new FeedbackService()
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
    this.editando = false;
    this.novoInvestimento = this.criarFormularioVazio();
    this.carregarSalariosElegiveis();
    const modalElement = document.getElementById('modalInvestimento');
    this.mostrarModal(modalElement);
  }

  abrirModalEditar(investimento: Investimento): void {
    this.editando = true;
    this.novoInvestimento = {
      ...investimento,
      dataInvestimento: investimento.dataInvestimento.substring(0, 10),
      mesReferencia: (investimento.mesReferencia ?? investimento.dataInvestimento).substring(0, 7),
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
    if (this.salvandoInvestimento) {
      return;
    }

    const mensagemValidacao = this.validarFormulario();
    if (mensagemValidacao) {
      this.mostrarAviso(mensagemValidacao);
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

  private criarFormularioVazio(): InvestimentoForm {
    return {
      id: '',
      nome: '',
      descricao: '',
      tipo: '',
      quantidade: 0,
      precoMedio: 0,
      valorAtual: 0,
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

  formatarDataCivil(valor: string): string {
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
