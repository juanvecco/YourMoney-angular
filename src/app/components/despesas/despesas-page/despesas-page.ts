import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DespesaService, Despesa, Categoria, CriarParcelamentoRequest, ParcelaPreview } from '../../../services/despesa';
import { DespesaRecorrenteService } from '../../../services/despesa-recorrente';
import {
    ConfirmarSugestaoDespesaRecorrenteRequest,
    DespesaRecorrenteRequest,
    DespesaRecorrenteResponse,
    SugestaoDespesaRecorrenteResponse
} from '../../../models/despesa-recorrente.model';
import Swal from 'sweetalert2';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';
import { MonthPickerComponent } from '../../shared/month-picker/month-picker';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ViewStateComponent } from '../../shared/view-state/view-state';

type DespesaLote = {
    descricao: string;
    valor: number;
    data: string;
    mesReferencia: string;
    idContaFinanceira: string;
    idCategoria: string;
    contaDescricao: string;
    categoriaDescricao: string;
};

type DespesaRecorrenteForm = {
    descricao: string;
    valorPrevisto: number;
    dataVencimento: string;
    dataInicio: string;
    dataTermino: string;
    idContaFinanceira: string;
    idTipoDespesa: string;
    idNaturezaDespesa: string;
    idCategoriaEspecifica: string;
};

type SugestaoRecorrenteForm = {
    descricao: string;
    valor: number;
    data: string;
    idContaFinanceira: string;
    idTipoDespesa: string;
    idNaturezaDespesa: string;
    idCategoriaEspecifica: string;
};

@Component({
    selector: 'app-despesas-page',
    standalone: true,
    imports: [CommonModule, FormsModule, MonthPickerComponent, PageHeaderComponent, ViewStateComponent],
    templateUrl: './despesas-page.html',
    styleUrls: ['./despesas-page.scss']
})
export class DespesasComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    private loadRevision = 0;

    // === FORMULÁRIO ===
    novaDespesa = {
        id: '',
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        mesReferencia: this.obterMesReferenciaInput(new Date()),
        idContaFinanceira: '',
        idTipoDespesa: '',
        idNaturezaDespesa: '',
        idCategoriaEspecifica: ''
    };

    editando = false;
    despesasEmLote: DespesaLote[] = [];
    parcelamentoAtivo = false;
    quantidadeParcelas = 1;
    parcelasPreview: ParcelaPreview[] = [];
    salvandoDespesa = false;
    salvandoParcelamento = false;

    // === DADOS ===
    contas: any[] = [];
    tiposDespesa: Categoria[] = [];
    naturezasDespesa: Categoria[] = [];
    categoriasEspecificas: Categoria[] = [];
    naturezasFiltroDespesa: Categoria[] = [];

    despesas: Despesa[] = [];
    mesAtual: Date = new Date();
    totalDespesas = 0;
    totalDespesasFiltradas = 0;
    totalResultadosDespesas = 0;
    paginaAtual = 1;
    totalPaginas = 0;
    tamanhoPagina = 10;
    filtrosTransacoes = {
        idContaFinanceira: '',
        idTipoDespesa: '',
        idNaturezaDespesa: ''
    };
    totalPorConta: { descricao: string; valor: number }[] = [];
    estadoCarregamento: FinancialViewState = 'loading';
    mensagemCarregamento = '';

    recorrencias: DespesaRecorrenteResponse[] = [];
    sugestoesRecorrentes: SugestaoDespesaRecorrenteResponse[] = [];
    carregandoRecorrencias = false;
    carregandoSugestoesRecorrentes = false;
    salvandoRecorrencia = false;
    salvandoSugestaoRecorrente = false;
    recorrenciaEditandoId = '';
    sugestaoEmEdicaoId = '';
    novaRecorrencia: DespesaRecorrenteForm = this.criarFormularioRecorrencia();
    confirmacaoSugestao: SugestaoRecorrenteForm = this.criarFormularioSugestao();
    naturezasRecorrencia: Categoria[] = [];
    categoriasRecorrencia: Categoria[] = [];
    naturezasSugestao: Categoria[] = [];
    categoriasSugestao: Categoria[] = [];

    // === TRILHA & GAMIFICAÇÃO ===
    mostrarDicaCategorizacao = false;
    dicaDespesaHover: Despesa | null = null;
    usuarioCategorizouEsteMes = false;
    badgeOrganizadorDesbloqueado = false;

    // === CALENDÁRIO ===
    @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

    constructor(
        private despesaService: DespesaService,
        private despesaRecorrenteService: DespesaRecorrenteService,
        private authService: AuthService,
        private router: Router,
        private financialContext: FinancialNavigationContextService = new FinancialNavigationContextService()
    ) {
        this.mesAtual = this.financialContext.period().date;
    }

    ngOnInit() {
        this.filtrosTransacoes = { ...this.financialContext.expenseFilters() };
        this.carregarDadosIniciais();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ==============================================================
    // CARREGAMENTO
    // ==============================================================

    carregarDadosIniciais() {
        this.carregarContas();
        this.carregarCategoriasCompletas();
        this.carregarDespesas();
        this.carregarRecorrencias();
        this.carregarSugestoesRecorrentes();
    }

    carregarContas() {
        this.despesaService.listarContas()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (contas) => this.contas = contas,
                error: (erro) => console.error('Erro ao carregar contas', erro)
            });
    }

    carregarCategoriasCompletas() {
        this.despesaService.listarCategorias()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (categorias) => {
                    this.despesaService.setCategorias(categorias);
                    this.tiposDespesa = categorias.filter(c =>
                        c.categoriaPaiId === null && c.tipoTransacao === 1
                    );
                    this.naturezasFiltroDespesa = this.filtrosTransacoes.idTipoDespesa
                        ? categorias.filter(c => c.categoriaPaiId === this.filtrosTransacoes.idTipoDespesa)
                        : [];
                },
                error: (erro) => console.error('Erro ao carregar categorias', erro)
            });
    }

    carregarDespesas() {
        const revision = ++this.loadRevision;
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.despesas = [];
        this.totalDespesas = 0;
        this.totalDespesasFiltradas = 0;
        this.totalResultadosDespesas = 0;
        this.totalPaginas = 0;
        this.totalPorConta = [];
        this.estadoCarregamento = 'loading';
        this.atualizarMensagemCarregamento();

        this.despesaService.consultarDespesas({
            mes,
            ano,
            idContaFinanceira: this.filtrosTransacoes.idContaFinanceira || undefined,
            idTipoDespesa: this.filtrosTransacoes.idTipoDespesa || undefined,
            idNaturezaDespesa: this.filtrosTransacoes.idNaturezaDespesa || undefined,
            pagina: this.paginaAtual,
            tamanhoPagina: this.tamanhoPagina
        })
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    if (revision !== this.loadRevision) return;
                    this.despesas = response.itens;
                    this.paginaAtual = response.paginaAtual;
                    this.tamanhoPagina = response.tamanhoPagina;
                    this.totalPaginas = response.totalPaginas;
                    this.totalResultadosDespesas = response.totalResultados;
                    this.totalDespesasFiltradas = response.valorTotalFiltrado;
                    this.totalDespesas = response.valorTotalFiltrado;
                    this.aplicarTotaisPorConta(response.totaisPorConta ?? this.montarTotaisPorConta(this.despesas));
                    this.estadoCarregamento = response.totalResultados > 0 ? 'loadedWithData' : 'emptyPeriod';
                    this.atualizarMensagemCarregamento();
                    this.verificarTrilhaOrganizador();
                },
                error: (erro) => {
                    if (revision !== this.loadRevision) return;
                    console.error('Erro ao carregar despesas', erro);
                    if (this.deveUsarConsultaLegada(erro)) {
                        this.carregarDespesasPorReferenciaLegada(mes, ano, revision);
                        return;
                    }

                    this.aplicarErroCarregamento();
                }
            });
    }

    carregarRecorrencias() {
        this.carregandoRecorrencias = true;

        this.despesaRecorrenteService.listar()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.recorrencias = response.itens ?? [];
                    this.carregandoRecorrencias = false;
                },
                error: (erro) => {
                    console.error('Erro ao carregar despesas recorrentes', erro);
                    this.recorrencias = [];
                    this.carregandoRecorrencias = false;
                }
            });
    }

    carregarSugestoesRecorrentes() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.carregandoSugestoesRecorrentes = true;

        this.despesaRecorrenteService.listarSugestoes(mes, ano)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.sugestoesRecorrentes = response.itens ?? [];
                    this.carregandoSugestoesRecorrentes = false;
                    this.cancelarEdicaoSugestao();
                },
                error: (erro) => {
                    console.error('Erro ao carregar sugestões recorrentes', erro);
                    this.sugestoesRecorrentes = [];
                    this.carregandoSugestoesRecorrentes = false;
                }
            });
    }

    private carregarDespesasPorReferenciaLegada(mes: number, ano: number, revision: number) {
        this.despesaService.obterPorReferencia(mes, ano)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dados) => {
                    if (revision !== this.loadRevision) return;
                    this.aplicarResultadoLocal(dados);
                },
                error: (erro) => {
                    if (revision !== this.loadRevision) return;
                    console.error('Erro ao carregar despesas por referência', erro);
                    this.aplicarErroCarregamento();
                }
            });
    }

    private aplicarResultadoLocal(dados: Despesa[]) {
        const filtradas = this.filtrarDespesasLocalmente(dados)
            .sort((a, b) => {
                const data = new Date(b.data).getTime() - new Date(a.data).getTime();
                return data !== 0 ? data : b.id.localeCompare(a.id);
            });

        const totalResultados = filtradas.length;
        const totalPaginas = totalResultados === 0
            ? 0
            : Math.ceil(totalResultados / this.tamanhoPagina);

        if (totalPaginas > 0 && this.paginaAtual > totalPaginas) {
            this.paginaAtual = totalPaginas;
        }

        const inicio = totalResultados === 0 ? 0 : (this.paginaAtual - 1) * this.tamanhoPagina;
        this.despesas = filtradas.slice(inicio, inicio + this.tamanhoPagina);
        this.totalResultadosDespesas = totalResultados;
        this.totalPaginas = totalPaginas;
        this.totalDespesasFiltradas = filtradas.reduce((soma, despesa) => soma + this.obterValorLiquidoDespesa(despesa), 0);
        this.totalDespesas = this.totalDespesasFiltradas;
        this.aplicarTotaisPorConta(this.montarTotaisPorConta(filtradas));
        this.estadoCarregamento = totalResultados > 0 ? 'loadedWithData' : 'emptyPeriod';
        this.atualizarMensagemCarregamento();
        this.verificarTrilhaOrganizador();
    }

    private filtrarDespesasLocalmente(despesas: Despesa[]): Despesa[] {
        return despesas.filter(despesa => {
            const contaOk = !this.filtrosTransacoes.idContaFinanceira ||
                despesa.idContaFinanceira === this.filtrosTransacoes.idContaFinanceira;
            const tipoOk = this.categoriaPertenceAoFiltro(
                despesa.idCategoria,
                this.filtrosTransacoes.idTipoDespesa);
            const naturezaOk = this.categoriaPertenceAoFiltro(
                despesa.idCategoria,
                this.filtrosTransacoes.idNaturezaDespesa);

            return contaOk && tipoOk && naturezaOk;
        });
    }

    private categoriaPertenceAoFiltro(idCategoria: string, idFiltro: string): boolean {
        if (!idFiltro) return true;
        return this.obterCategoriaEDescendentes(idFiltro).has(idCategoria);
    }

    private obterCategoriaEDescendentes(idRaiz: string): Set<string> {
        const ids = new Set<string>([idRaiz]);
        let adicionou = true;

        while (adicionou) {
            adicionou = false;
            this.despesaService.todasCategorias.forEach(categoria => {
                if (categoria.categoriaPaiId && ids.has(categoria.categoriaPaiId) && !ids.has(categoria.id)) {
                    ids.add(categoria.id);
                    adicionou = true;
                }
            });
        }

        return ids;
    }

    private aplicarErroCarregamento() {
        this.despesas = [];
        this.totalDespesas = 0;
        this.totalDespesasFiltradas = 0;
        this.totalResultadosDespesas = 0;
        this.totalPaginas = 0;
        this.totalPorConta = [];
        this.estadoCarregamento = 'loadError';
        this.atualizarMensagemCarregamento();
    }

    private deveUsarConsultaLegada(erro: unknown): boolean {
        const status = (erro as { status?: number })?.status;
        return status === 0 || status === 404 || status === 405;
    }

    calcularTotalPorConta() {
        this.aplicarTotaisPorConta(this.montarTotaisPorConta(this.despesas));
    }

    private montarTotaisPorConta(despesas: Despesa[]) {
        const totalMap: { [id: string]: number } = {};
        despesas.forEach(d => {
            totalMap[d.idContaFinanceira] = (totalMap[d.idContaFinanceira] || 0) + this.obterValorLiquidoDespesa(d);
        });

        return Object.entries(totalMap).map(([id, valor]) => ({
            idContaFinanceira: id,
            valor
        }));
    }

    private aplicarTotaisPorConta(totais: { idContaFinanceira: string; valor: number }[]) {
        this.totalPorConta = totais.map(total => ({
            descricao: this.obterNomeConta(total.idContaFinanceira),
            valor: total.valor
        })).sort((a, b) => b.valor - a.valor);
    }

    // ==============================================================
    // NAVEGAÇÃO
    // ==============================================================

    public mudarMes(direcao: number) {
        this.financialContext.setPeriod(this.mesAtual);
        this.financialContext.shiftPeriod(direcao);
        this.mesAtual = this.financialContext.period().date;
        this.paginaAtual = 1;
        this.carregarDespesas();
        this.carregarSugestoesRecorrentes();
    }

    public abrirCalendario() {
        const el = this.calendarioInput.nativeElement as HTMLInputElement & { showPicker?: () => void };
        if (typeof el.showPicker === 'function') {
            el.showPicker();
        } else {
            el.click();
        }
    }

    public selecionarMesDoCalendario(event: Event) {
        const input = event.target as HTMLInputElement;
        const [ano, mes] = input.value.split('-').map(Number);
        this.financialContext.setPeriod(new Date(ano, mes - 1, 1));
        this.mesAtual = this.financialContext.period().date;
        this.paginaAtual = 1;
        this.carregarDespesas();
        this.carregarSugestoesRecorrentes();
    }

    selecionarMes(periodo: Date): void {
        this.financialContext.setPeriod(periodo);
        this.mesAtual = this.financialContext.period().date;
        this.paginaAtual = 1;
        this.carregarDespesas();
        this.carregarSugestoesRecorrentes();
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    // ==============================================================
    // MODAL
    // ==============================================================

    abrirModalDespesa() {
        this.editando = false;
        this.limparLote();
        this.resetForm();
        this.resetParcelamento();
        this.abrirModal();
    }

    abrirModalEditar(despesa: Despesa) {
        this.editando = true;
        this.resetParcelamento();
        this.novaDespesa = {
            id: despesa.id,
            descricao: despesa.descricao,
            valor: despesa.valor,
            data: new Date(despesa.data).toISOString().split('T')[0],
            mesReferencia: this.obterMesReferenciaInput(despesa.mesReferencia || despesa.data),
            idContaFinanceira: despesa.idContaFinanceira || '',
            idTipoDespesa: '',
            idNaturezaDespesa: '',
            idCategoriaEspecifica: ''
        };
        this.carregarCascataCategoria(despesa.idCategoria);
        this.abrirModal();
    }

    private abrirModal() {
        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDespesa'));
        modal.show();
    }

    private resetForm() {
        this.novaDespesa = {
            id: '', descricao: '', valor: 0, data: new Date().toISOString().split('T')[0],
            mesReferencia: this.obterMesReferenciaInput(this.mesAtual),
            idContaFinanceira: '', idTipoDespesa: '', idNaturezaDespesa: '', idCategoriaEspecifica: ''
        };
        this.naturezasDespesa = [];
        this.categoriasEspecificas = [];
        this.resetParcelamento();
    }

    private resetParcelamento() {
        this.parcelamentoAtivo = false;
        this.quantidadeParcelas = 1;
        this.parcelasPreview = [];
        this.salvandoDespesa = false;
        this.salvandoParcelamento = false;
    }

    // ==============================================================
    // DESPESAS RECORRENTES
    // ==============================================================

    abrirModalRecorrencia(recorrencia?: DespesaRecorrenteResponse) {
        this.recorrenciaEditandoId = recorrencia?.id ?? '';
        this.novaRecorrencia = this.criarFormularioRecorrencia(recorrencia);
        this.naturezasRecorrencia = [];
        this.categoriasRecorrencia = [];

        if (recorrencia) {
            this.carregarCascataRecorrencia(recorrencia.idCategoria);
        }

        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalRecorrencia'));
        modal.show();
    }

    salvarRecorrencia() {
        if (this.salvandoRecorrencia) return;

        if (!this.recorrenciaValida()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const payload = this.montarPayloadRecorrencia();
        const request$ = this.recorrenciaEditandoId
            ? this.despesaRecorrenteService.atualizar(this.recorrenciaEditandoId, payload)
            : this.despesaRecorrenteService.criar(payload);

        this.salvandoRecorrencia = true;

        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.salvandoRecorrencia = false;
                this.fecharModalPorId('modalRecorrencia');
                this.carregarRecorrencias();
                this.carregarSugestoesRecorrentes();
                Swal.fire({
                    icon: 'success',
                    title: this.recorrenciaEditandoId ? 'Recorrência atualizada!' : 'Recorrência cadastrada!',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: (erro) => {
                this.salvandoRecorrencia = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao salvar recorrência!',
                    text: this.extrairMensagemErroSalvar(erro),
                    confirmButtonColor: '#dc3545'
                });
            }
        });
    }

    desativarRecorrencia(recorrencia: DespesaRecorrenteResponse) {
        Swal.fire({
            title: 'Desativar recorrência?',
            text: 'As sugestões futuras deixarão de ser apresentadas.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Desativar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545'
        }).then(result => {
            if (!result.isConfirmed) return;

            this.despesaRecorrenteService.desativar(recorrencia.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.carregarRecorrencias();
                        this.carregarSugestoesRecorrentes();
                        Swal.fire('Desativada!', '', 'success');
                    },
                    error: () => Swal.fire('Erro!', 'Não foi possível desativar a recorrência.', 'error')
                });
        });
    }

    encerrarRecorrencia(recorrencia: DespesaRecorrenteResponse) {
        const hoje = new Date().toISOString().split('T')[0];

        Swal.fire({
            title: 'Encerrar recorrência',
            input: 'date',
            inputValue: this.normalizarDataInput(recorrencia.dataTermino) || hoje,
            showCancelButton: true,
            confirmButtonText: 'Encerrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545'
        }).then(result => {
            if (!result.isConfirmed || !result.value) return;

            this.despesaRecorrenteService.encerrar(recorrencia.id, { dataTermino: result.value })
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.carregarRecorrencias();
                        this.carregarSugestoesRecorrentes();
                        Swal.fire('Encerrada!', '', 'success');
                    },
                    error: () => Swal.fire('Erro!', 'Não foi possível encerrar a recorrência.', 'error')
                });
        });
    }

    recorrenciaValida(): boolean {
        return !!(
            this.novaRecorrencia.descricao &&
            this.novaRecorrencia.valorPrevisto > 0 &&
            this.novaRecorrencia.dataVencimento &&
            this.novaRecorrencia.dataInicio &&
            this.novaRecorrencia.idContaFinanceira &&
            this.novaRecorrencia.idTipoDespesa &&
            this.novaRecorrencia.idNaturezaDespesa
        );
    }

    onTipoRecorrenciaChange() {
        const tipoId = this.novaRecorrencia.idTipoDespesa;
        this.naturezasRecorrencia = tipoId
            ? this.despesaService.todasCategorias.filter(c => c.categoriaPaiId === tipoId)
            : [];
        this.novaRecorrencia.idNaturezaDespesa = '';
        this.novaRecorrencia.idCategoriaEspecifica = '';
        this.categoriasRecorrencia = [];
    }

    onNaturezaRecorrenciaChange() {
        const naturezaId = this.novaRecorrencia.idNaturezaDespesa;
        this.categoriasRecorrencia = naturezaId
            ? this.despesaService.todasCategorias.filter(c => c.categoriaPaiId === naturezaId)
            : [];
        this.novaRecorrencia.idCategoriaEspecifica = '';
    }

    editarSugestao(sugestao: SugestaoDespesaRecorrenteResponse) {
        if (sugestao.status !== 'Pendente') return;

        this.sugestaoEmEdicaoId = sugestao.ocorrenciaId;
        this.confirmacaoSugestao = this.criarFormularioSugestao(sugestao);
        this.naturezasSugestao = [];
        this.categoriasSugestao = [];
        this.carregarCascataSugestao(sugestao.idCategoria);
    }

    cancelarEdicaoSugestao() {
        this.sugestaoEmEdicaoId = '';
        this.confirmacaoSugestao = this.criarFormularioSugestao();
        this.naturezasSugestao = [];
        this.categoriasSugestao = [];
    }

    confirmarSugestao(sugestao: SugestaoDespesaRecorrenteResponse) {
        if (this.salvandoSugestaoRecorrente || sugestao.status !== 'Pendente') return;

        const editandoSugestao = this.sugestaoEmEdicaoId === sugestao.ocorrenciaId;

        if (editandoSugestao && !this.sugestaoEditadaValida()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const payload = editandoSugestao ? this.montarPayloadSugestao() : {};
        this.salvandoSugestaoRecorrente = true;

        this.despesaRecorrenteService.confirmarSugestao(sugestao.ocorrenciaId, payload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.salvandoSugestaoRecorrente = false;
                    this.cancelarEdicaoSugestao();
                    this.carregarSugestoesRecorrentes();
                    this.carregarDespesas();
                    Swal.fire({
                        icon: 'success',
                        title: 'Despesa confirmada!',
                        timer: 1800,
                        showConfirmButton: false
                    });
                },
                error: (erro) => {
                    this.salvandoSugestaoRecorrente = false;
                    Swal.fire({
                        icon: 'error',
                        title: 'Erro ao confirmar sugestão!',
                        text: this.extrairMensagemErroSalvar(erro),
                        confirmButtonColor: '#dc3545'
                    });
                }
            });
    }

    ignorarSugestao(sugestao: SugestaoDespesaRecorrenteResponse) {
        if (this.salvandoSugestaoRecorrente || sugestao.status !== 'Pendente') return;

        Swal.fire({
            title: 'Ignorar sugestão?',
            text: 'Essa sugestão mensal será cancelada, sem afetar os próximos meses.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ignorar',
            cancelButtonText: 'Voltar',
            confirmButtonColor: '#dc3545'
        }).then(result => {
            if (!result.isConfirmed) return;

            this.salvandoSugestaoRecorrente = true;
            this.despesaRecorrenteService.ignorarSugestao(sugestao.ocorrenciaId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.salvandoSugestaoRecorrente = false;
                        this.cancelarEdicaoSugestao();
                        this.carregarSugestoesRecorrentes();
                        Swal.fire('Ignorada!', '', 'success');
                    },
                    error: () => {
                        this.salvandoSugestaoRecorrente = false;
                        Swal.fire('Erro!', 'Não foi possível ignorar a sugestão.', 'error');
                    }
                });
        });
    }

    onTipoSugestaoChange() {
        const tipoId = this.confirmacaoSugestao.idTipoDespesa;
        this.naturezasSugestao = tipoId
            ? this.despesaService.todasCategorias.filter(c => c.categoriaPaiId === tipoId)
            : [];
        this.confirmacaoSugestao.idNaturezaDespesa = '';
        this.confirmacaoSugestao.idCategoriaEspecifica = '';
        this.categoriasSugestao = [];
    }

    onNaturezaSugestaoChange() {
        const naturezaId = this.confirmacaoSugestao.idNaturezaDespesa;
        this.categoriasSugestao = naturezaId
            ? this.despesaService.todasCategorias.filter(c => c.categoriaPaiId === naturezaId)
            : [];
        this.confirmacaoSugestao.idCategoriaEspecifica = '';
    }

    temSugestoesPendentes(): boolean {
        return this.sugestoesRecorrentes.some(sugestao => sugestao.status === 'Pendente');
    }

    obterTotalSugestoesPendentes(): number {
        return this.sugestoesRecorrentes
            .filter(sugestao => sugestao.status === 'Pendente')
            .reduce((total, sugestao) => total + sugestao.valorPrevisto, 0);
    }

    obterStatusSugestaoClasse(status: string): string {
        return {
            Pendente: 'ym-status-pendente',
            Confirmada: 'ym-status-confirmada',
            Ignorada: 'ym-status-ignorada'
        }[status] ?? 'ym-status-pendente';
    }

    private criarFormularioRecorrencia(recorrencia?: DespesaRecorrenteResponse): DespesaRecorrenteForm {
        return {
            descricao: recorrencia?.descricao ?? '',
            valorPrevisto: recorrencia?.valorPrevisto ?? 0,
            dataVencimento: recorrencia
                ? this.montarDataNoMesAtual(recorrencia.diaVencimento)
                : this.montarDataNoMesAtual(new Date().getDate()),
            dataInicio: this.normalizarDataInput(recorrencia?.dataInicio) || this.obterPrimeiroDiaMesInput(this.mesAtual),
            dataTermino: this.normalizarDataInput(recorrencia?.dataTermino),
            idContaFinanceira: recorrencia?.idContaFinanceira ?? '',
            idTipoDespesa: '',
            idNaturezaDespesa: '',
            idCategoriaEspecifica: ''
        };
    }

    private criarFormularioSugestao(sugestao?: SugestaoDespesaRecorrenteResponse): SugestaoRecorrenteForm {
        return {
            descricao: sugestao?.descricao ?? '',
            valor: sugestao?.valorPrevisto ?? 0,
            data: this.normalizarDataInput(sugestao?.dataSugerida),
            idContaFinanceira: sugestao?.idContaFinanceira ?? '',
            idTipoDespesa: '',
            idNaturezaDespesa: '',
            idCategoriaEspecifica: ''
        };
    }

    private montarPayloadRecorrencia(): DespesaRecorrenteRequest {
        return {
            descricao: this.novaRecorrencia.descricao,
            valorPrevisto: Number(this.novaRecorrencia.valorPrevisto),
            idContaFinanceira: this.novaRecorrencia.idContaFinanceira,
            idTipoDespesa: this.novaRecorrencia.idTipoDespesa,
            idNaturezaDespesa: this.novaRecorrencia.idNaturezaDespesa,
            idCategoria: this.obterIdCategoriaFinalRecorrencia(),
            dataVencimento: this.novaRecorrencia.dataVencimento,
            dataInicio: this.novaRecorrencia.dataInicio,
            dataTermino: this.novaRecorrencia.dataTermino || null
        };
    }

    private montarPayloadSugestao(): ConfirmarSugestaoDespesaRecorrenteRequest {
        return {
            descricao: this.confirmacaoSugestao.descricao,
            valor: Number(this.confirmacaoSugestao.valor),
            data: this.confirmacaoSugestao.data,
            idContaFinanceira: this.confirmacaoSugestao.idContaFinanceira,
            idTipoDespesa: this.confirmacaoSugestao.idTipoDespesa,
            idNaturezaDespesa: this.confirmacaoSugestao.idNaturezaDespesa,
            idCategoria: this.obterIdCategoriaFinalSugestao()
        };
    }

    sugestaoEditadaValida(): boolean {
        return !!(
            this.confirmacaoSugestao.descricao &&
            this.confirmacaoSugestao.valor > 0 &&
            this.confirmacaoSugestao.data &&
            this.confirmacaoSugestao.idContaFinanceira &&
            this.confirmacaoSugestao.idTipoDespesa &&
            this.confirmacaoSugestao.idNaturezaDespesa
        );
    }

    private obterIdCategoriaFinalRecorrencia(): string {
        return this.novaRecorrencia.idCategoriaEspecifica ||
            this.novaRecorrencia.idNaturezaDespesa ||
            this.novaRecorrencia.idTipoDespesa;
    }

    private obterIdCategoriaFinalSugestao(): string {
        return this.confirmacaoSugestao.idCategoriaEspecifica ||
            this.confirmacaoSugestao.idNaturezaDespesa ||
            this.confirmacaoSugestao.idTipoDespesa;
    }

    private carregarCascataRecorrencia(idCategoria: string) {
        const todas = this.despesaService.todasCategorias;
        const cat = todas.find(c => c.id === idCategoria);
        if (!cat) return;

        if (!cat.categoriaPaiId) {
            this.novaRecorrencia.idTipoDespesa = cat.id;
            this.naturezasRecorrencia = todas.filter(c => c.categoriaPaiId === cat.id);
            return;
        }

        const pai = todas.find(c => c.id === cat.categoriaPaiId);
        if (pai && !pai.categoriaPaiId) {
            this.novaRecorrencia.idTipoDespesa = pai.id;
            this.novaRecorrencia.idNaturezaDespesa = cat.id;
            this.naturezasRecorrencia = todas.filter(c => c.categoriaPaiId === pai.id);
            this.categoriasRecorrencia = todas.filter(c => c.categoriaPaiId === cat.id);
            return;
        }

        const avo = todas.find(c => c.id === pai?.categoriaPaiId);
        this.novaRecorrencia.idTipoDespesa = avo?.id || '';
        this.novaRecorrencia.idNaturezaDespesa = pai?.id || '';
        this.novaRecorrencia.idCategoriaEspecifica = cat.id;
        this.naturezasRecorrencia = todas.filter(c => c.categoriaPaiId === avo?.id);
        this.categoriasRecorrencia = todas.filter(c => c.categoriaPaiId === pai?.id);
    }

    private carregarCascataSugestao(idCategoria: string) {
        const todas = this.despesaService.todasCategorias;
        const cat = todas.find(c => c.id === idCategoria);
        if (!cat) return;

        if (!cat.categoriaPaiId) {
            this.confirmacaoSugestao.idTipoDespesa = cat.id;
            this.naturezasSugestao = todas.filter(c => c.categoriaPaiId === cat.id);
            return;
        }

        const pai = todas.find(c => c.id === cat.categoriaPaiId);
        if (pai && !pai.categoriaPaiId) {
            this.confirmacaoSugestao.idTipoDespesa = pai.id;
            this.confirmacaoSugestao.idNaturezaDespesa = cat.id;
            this.naturezasSugestao = todas.filter(c => c.categoriaPaiId === pai.id);
            this.categoriasSugestao = todas.filter(c => c.categoriaPaiId === cat.id);
            return;
        }

        const avo = todas.find(c => c.id === pai?.categoriaPaiId);
        this.confirmacaoSugestao.idTipoDespesa = avo?.id || '';
        this.confirmacaoSugestao.idNaturezaDespesa = pai?.id || '';
        this.confirmacaoSugestao.idCategoriaEspecifica = cat.id;
        this.naturezasSugestao = todas.filter(c => c.categoriaPaiId === avo?.id);
        this.categoriasSugestao = todas.filter(c => c.categoriaPaiId === pai?.id);
    }

    // ==============================================================
    // CASCATA
    // ==============================================================

    private carregarCascataCategoria(idCategoria: string) {
        const todas = this.despesaService.todasCategorias;
        const cat = todas.find(c => c.id === idCategoria);
        if (!cat) return;

        if (!cat.categoriaPaiId) {
            this.novaDespesa.idTipoDespesa = cat.id;
            this.naturezasDespesa = todas.filter(c => c.categoriaPaiId === cat.id);
        } else {
            const pai = todas.find(c => c.id === cat.categoriaPaiId);
            if (pai && !pai.categoriaPaiId) {
                this.novaDespesa.idTipoDespesa = pai.id;
                this.novaDespesa.idNaturezaDespesa = cat.id;
                this.naturezasDespesa = todas.filter(c => c.categoriaPaiId === pai.id);
                this.categoriasEspecificas = todas.filter(c => c.categoriaPaiId === cat.id);
            } else {
                const avo = todas.find(c => c.id === pai?.categoriaPaiId);
                this.novaDespesa.idTipoDespesa = avo?.id || '';
                this.novaDespesa.idNaturezaDespesa = pai?.id || '';
                this.novaDespesa.idCategoriaEspecifica = cat.id;
                this.naturezasDespesa = todas.filter(c => c.categoriaPaiId === avo?.id);
                this.categoriasEspecificas = todas.filter(c => c.categoriaPaiId === pai?.id);
            }
        }
    }

    onTipoChange() {
        const tipoId = this.novaDespesa.idTipoDespesa;
        this.naturezasDespesa = tipoId
            ? this.despesaService.todasCategorias.filter(c => c.categoriaPaiId === tipoId)
            : [];
        this.novaDespesa.idNaturezaDespesa = '';
        this.novaDespesa.idCategoriaEspecifica = '';
        this.categoriasEspecificas = [];
    }

    onNaturezaChange() {
        const naturezaId = this.novaDespesa.idNaturezaDespesa;
        this.categoriasEspecificas = naturezaId
            ? this.despesaService.todasCategorias.filter(c => c.categoriaPaiId === naturezaId)
            : [];
        this.novaDespesa.idCategoriaEspecifica = '';
    }

    onFiltroTipoChange() {
        const tipoId = this.filtrosTransacoes.idTipoDespesa;
        this.naturezasFiltroDespesa = tipoId
            ? this.despesaService.todasCategorias.filter(c => c.categoriaPaiId === tipoId)
            : [];
        this.filtrosTransacoes.idNaturezaDespesa = '';
        this.aplicarFiltrosTransacoes();
    }

    aplicarFiltrosTransacoes() {
        this.paginaAtual = 1;
        this.financialContext.setExpenseFilters(this.filtrosTransacoes);
        this.carregarDespesas();
    }

    limparFiltrosTransacoes() {
        this.filtrosTransacoes = {
            idContaFinanceira: '',
            idTipoDespesa: '',
            idNaturezaDespesa: ''
        };
        this.naturezasFiltroDespesa = [];
        this.financialContext.clearExpenseFilters();
        this.aplicarFiltrosTransacoes();
    }

    temFiltrosTransacoesAtivos(): boolean {
        return !!(
            this.filtrosTransacoes.idContaFinanceira ||
            this.filtrosTransacoes.idTipoDespesa ||
            this.filtrosTransacoes.idNaturezaDespesa
        );
    }

    irParaPagina(pagina: number) {
        if (pagina < 1 || pagina > this.totalPaginas || pagina === this.paginaAtual) {
            return;
        }

        this.paginaAtual = pagina;
        this.carregarDespesas();
    }

    paginasVisiveis(): number[] {
        if (this.totalPaginas <= 1) return [];

        const inicio = Math.max(1, this.paginaAtual - 2);
        const fim = Math.min(this.totalPaginas, inicio + 4);
        const primeiro = Math.max(1, fim - 4);

        return Array.from({ length: fim - primeiro + 1 }, (_, index) => primeiro + index);
    }

    // ==============================================================
    // SALVAR
    // ==============================================================

    salvarDespesa() {
        if (this.salvandoDespesa || this.salvandoParcelamento) {
            return;
        }

        if (!this.camposObrigatoriosPreenchidos()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        if (!this.editando && this.parcelamentoAtivo && this.quantidadeParcelas > 1) {
            this.salvarParcelamento();
            return;
        }

        const payload = this.montarPayloadDespesa();

        const request$ = this.editando
            ? this.despesaService.atualizarDespesa(payload)
            : this.despesaService.criarDespesa({
                descricao: payload.descricao,
                valor: payload.valor,
                data: payload.data,
                mesReferencia: payload.mesReferencia,
                idContaFinanceira: payload.idContaFinanceira,
                idCategoria: payload.idCategoria
            });

        this.salvandoDespesa = true;

        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.salvandoDespesa = false;
                this.fecharModal();
                this.carregarDespesas();
                this.mostrarSucesso();
                this.verificarBadgeOrganizador();
            },
            error: (erro) => {
                this.salvandoDespesa = false;
                this.mostrarErro(erro);
            }
        });
    }

    adicionarDespesaAoLote() {
        if (this.editando || this.parcelamentoAtivo) return;

        if (!this.camposObrigatoriosPreenchidos()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const payload = this.montarPayloadDespesa();

        this.despesasEmLote = [
            ...this.despesasEmLote,
            {
                descricao: payload.descricao,
                valor: payload.valor,
                data: payload.data,
                mesReferencia: payload.mesReferencia,
                idContaFinanceira: payload.idContaFinanceira,
                idCategoria: payload.idCategoria,
                contaDescricao: this.obterNomeConta(payload.idContaFinanceira),
                categoriaDescricao: this.obterNomeCategoria(payload.idCategoria)
            }
        ];

        this.prepararProximaDespesa();
    }

    removerDespesaDoLote(index: number) {
        this.despesasEmLote = this.despesasEmLote.filter((_, i) => i !== index);
    }

    limparLote() {
        this.despesasEmLote = [];
    }

    salvarLoteDespesas() {
        if (this.despesasEmLote.length === 0) return;

        const requests = this.despesasEmLote.map(despesa =>
            this.despesaService.criarDespesa({
                descricao: despesa.descricao,
                valor: despesa.valor,
                data: despesa.data,
                mesReferencia: despesa.mesReferencia,
                idContaFinanceira: despesa.idContaFinanceira,
                idCategoria: despesa.idCategoria
            })
        );

        forkJoin(requests)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.limparLote();
                    this.fecharModal();
                    this.carregarDespesas();
                    Swal.fire({
                        icon: 'success',
                        title: 'Lote cadastrado!',
                        text: 'Todas as despesas do lote foram salvas.',
                        timer: 2200,
                        showConfirmButton: false
                    });
                },
                error: () => Swal.fire({
                    icon: 'error',
                    title: 'Erro!',
                    text: 'Não foi possível salvar todas as despesas do lote.',
                    confirmButtonColor: '#dc3545'
                })
            });
    }

    obterTotalLote(): number {
        return this.despesasEmLote.reduce((total, despesa) => total + despesa.valor, 0);
    }

    private montarPayloadDespesa() {
        return {
            id: this.novaDespesa.id,
            descricao: this.novaDespesa.descricao,
            valor: this.novaDespesa.valor,
            data: this.novaDespesa.data,
            mesReferencia: this.converterMesReferenciaParaApi(this.novaDespesa.mesReferencia),
            idContaFinanceira: this.novaDespesa.idContaFinanceira,
            idCategoria: this.obterIdCategoriaFinal()
        };
    }

    private montarPayloadParcelamento(): CriarParcelamentoRequest {
        return {
            descricao: this.novaDespesa.descricao,
            valorTotal: this.novaDespesa.valor,
            dataInicial: this.novaDespesa.data,
            mesReferenciaInicial: this.converterMesReferenciaParaApi(this.novaDespesa.mesReferencia),
            quantidadeParcelas: this.quantidadeParcelas,
            idContaFinanceira: this.novaDespesa.idContaFinanceira,
            idCategoria: this.obterIdCategoriaFinal()
        };
    }

    private obterIdCategoriaFinal(): string {
        return this.novaDespesa.idCategoriaEspecifica ||
            this.novaDespesa.idNaturezaDespesa ||
            this.novaDespesa.idTipoDespesa;
    }

    private camposObrigatoriosPreenchidos(): boolean {
        return !!(
            this.novaDespesa.descricao &&
            this.novaDespesa.valor > 0 &&
            this.novaDespesa.data &&
            this.novaDespesa.mesReferencia &&
            this.novaDespesa.idContaFinanceira &&
            this.novaDespesa.idTipoDespesa
        );
    }

    parcelamentoValido(): boolean {
        const quantidade = Number(this.quantidadeParcelas);

        return !this.parcelamentoAtivo || (
            Number.isInteger(quantidade) &&
            quantidade >= 1 &&
            quantidade <= 120 &&
            this.novaDespesa.valor > 0 &&
            !!this.novaDespesa.data
        );
    }

    onParcelamentoToggle() {
        if (!this.parcelamentoAtivo) {
            this.quantidadeParcelas = 1;
            this.parcelasPreview = [];
            return;
        }

        this.quantidadeParcelas = Number(this.quantidadeParcelas);

        if (this.quantidadeParcelas < 2) {
            this.quantidadeParcelas = 2;
        }

        this.atualizarPreviewParcelamento();
    }

    atualizarPreviewParcelamento() {
        this.quantidadeParcelas = Number(this.quantidadeParcelas);

        if (!this.parcelamentoAtivo || !this.parcelamentoValido() || this.quantidadeParcelas <= 1) {
            this.parcelasPreview = [];
            return;
        }

        this.parcelasPreview = this.calcularParcelasPreview(
            this.novaDespesa.valor,
            this.quantidadeParcelas,
            this.novaDespesa.data
        );
    }

    calcularParcelasPreview(valorTotal: number, quantidadeParcelas: number, dataInicial: string): ParcelaPreview[] {
        if (valorTotal <= 0 || quantidadeParcelas < 1 || !Number.isInteger(quantidadeParcelas)) {
            return [];
        }

        const totalCentavos = Math.round(valorTotal * 100);
        const valorBase = Math.floor(totalCentavos / quantidadeParcelas);
        const resto = totalCentavos % quantidadeParcelas;

        return Array.from({ length: quantidadeParcelas }, (_, index) => {
            const valorCentavos = valorBase + (index < resto ? 1 : 0);
            const data = this.adicionarMesesComAjuste(dataInicial, index);

            return {
                numeroParcela: index + 1,
                totalParcelas: quantidadeParcelas,
                valor: valorCentavos / 100,
                data,
                mesReferencia: this.converterMesReferenciaParaApi(this.obterMesReferenciaInput(data))
            };
        });
    }

    private adicionarMesesComAjuste(dataInicial: string, mesesParaAdicionar: number): string {
        const [ano, mes, dia] = dataInicial.split('-').map(Number);
        const mesIndex = mes - 1 + mesesParaAdicionar;
        const ultimoDiaDoMes = new Date(ano, mesIndex + 1, 0).getDate();
        const data = new Date(ano, mesIndex, Math.min(dia, ultimoDiaDoMes));
        const anoFinal = data.getFullYear();
        const mesFinal = String(data.getMonth() + 1).padStart(2, '0');
        const diaFinal = String(data.getDate()).padStart(2, '0');

        return `${anoFinal}-${mesFinal}-${diaFinal}`;
    }

    private salvarParcelamento() {
        if (!this.parcelamentoValido()) {
            this.mostrarAlertaParcelamentoInvalido();
            return;
        }

        this.salvandoParcelamento = true;

        this.despesaService.criarParcelamento(this.montarPayloadParcelamento())
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.salvandoParcelamento = false;
                    this.fecharModal();
                    this.carregarDespesas();
                    this.resetForm();
                    Swal.fire({
                        icon: 'success',
                        title: 'Despesa parcelada cadastrada!',
                        text: `${response.quantidadeParcelas} parcelas foram criadas.`,
                        timer: 2200,
                        showConfirmButton: false
                    });
                    this.verificarBadgeOrganizador();
                },
                error: () => {
                    this.salvandoParcelamento = false;
                    this.mostrarErroParcelamento();
                }
            });
    }

    private mostrarAlertaParcelamentoInvalido() {
        Swal.fire({
            icon: 'warning',
            title: 'Parcelamento inválido!',
            text: 'Informe um valor maior que zero e uma quantidade de parcelas entre 1 e 120.',
            confirmButtonColor: '#d4af37'
        });
    }

    private mostrarAlertaCamposObrigatorios() {
        Swal.fire({ icon: 'warning', title: 'Campos obrigatórios!', text: 'Preencha todos os campos.', confirmButtonColor: '#d4af37' });
    }

    private mostrarSucesso() {
        Swal.fire({ icon: 'success', title: this.editando ? 'Atualizada!' : 'Cadastrada!', timer: 2000, showConfirmButton: false });
    }

    private mostrarErro(erro?: unknown) {
        Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar despesa!',
            text: this.extrairMensagemErroSalvar(erro),
            confirmButtonColor: '#dc3545'
        });
    }

    private mostrarErroParcelamento() {
        Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar parcelamento!',
            text: 'Não foi possível criar todas as parcelas. Revise os dados e tente novamente.',
            confirmButtonColor: '#dc3545'
        });
    }

    private extrairMensagemErroSalvar(erro: unknown): string {
        const httpError = erro as {
            status?: number;
            error?: { message?: string; errors?: { Mensagens?: string[] } };
            message?: string;
        };

        if (httpError.status === 401) {
            return 'Sessão expirada. Faça login novamente.';
        }

        return httpError.error?.errors?.Mensagens?.join(', ') ||
            httpError.error?.message ||
            httpError.message ||
            'Não foi possível salvar. Revise os dados e tente novamente.';
    }

    private prepararProximaDespesa() {
        this.novaDespesa = {
            ...this.novaDespesa,
            id: '',
            descricao: '',
            valor: 0
        };
    }

    obterMesReferenciaTexto(mesReferencia?: string): string {
        if (!mesReferencia) return 'Sem referência';

        const data = new Date(`${this.obterMesReferenciaInput(mesReferencia)}-01T00:00:00`);
        return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }

    formatarData(data: string): string {
        const [ano, mes, dia] = data.substring(0, 10).split('-').map(Number);
        return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
    }

    temParcelamento(despesa: Despesa): boolean {
        return !!despesa.numeroParcela && !!despesa.totalParcelas && despesa.totalParcelas > 1;
    }

    obterRotuloParcela(despesa: Despesa): string {
        if (!this.temParcelamento(despesa)) {
            return '';
        }

        return `Parcela ${despesa.numeroParcela}/${despesa.totalParcelas}`;
    }

    obterNomeConta(id: string): string {
        return this.contas.find(c => c.id === id)?.descricao || 'Conta Desconhecida';
    }

    private obterMesReferenciaInput(data: Date | string): string {
        if (typeof data === 'string' && /^\d{4}-\d{2}/.test(data)) {
            return data.substring(0, 7);
        }

        const valor = data instanceof Date ? data : new Date(data);
        const ano = valor.getFullYear();
        const mes = String(valor.getMonth() + 1).padStart(2, '0');
        return `${ano}-${mes}`;
    }

    private obterPrimeiroDiaMesInput(data: Date): string {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        return `${ano}-${mes}-01`;
    }

    private montarDataNoMesAtual(dia: number): string {
        const ano = this.mesAtual.getFullYear();
        const mesIndex = this.mesAtual.getMonth();
        const ultimoDia = new Date(ano, mesIndex + 1, 0).getDate();
        const diaAjustado = Math.min(Math.max(Number(dia) || 1, 1), ultimoDia);
        const mes = String(mesIndex + 1).padStart(2, '0');
        return `${ano}-${mes}-${String(diaAjustado).padStart(2, '0')}`;
    }

    private normalizarDataInput(data?: string | null): string {
        return data ? data.substring(0, 10) : '';
    }

    private converterMesReferenciaParaApi(mesReferencia: string): string {
        return `${mesReferencia}-01`;
    }

    private fecharModal() {
        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('modalDespesa'));
        modal?.hide();
    }

    private fecharModalPorId(id: string) {
        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById(id));
        modal?.hide();
    }

    deletarDespesa(id: string) {
        Swal.fire({
            title: 'Deletar?', text: 'Não pode ser desfeito.', icon: 'warning',
            showCancelButton: true, confirmButtonText: 'Sim', cancelButtonText: 'Não',
            confirmButtonColor: '#dc3545'
        }).then(result => {
            if (result.isConfirmed) {
                this.despesaService.deletarDespesa(id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.carregarDespesas();
                            Swal.fire('Deletado!', '', 'success');
                        },
                        error: () => Swal.fire('Erro!', '', 'error')
                    });
            }
        });
    }

    // ==============================================================
    // TRILHA & GAMIFICAÇÃO
    // ==============================================================

    verificarTrilhaOrganizador() {
        const semCatEspecifica = this.despesas.filter(d =>
            !d.idCategoria || this.isCategoriaTipoOuNatureza(d.idCategoria)
        );
        this.usuarioCategorizouEsteMes = semCatEspecifica.length === 0 && this.despesas.length > 0;
        this.mostrarDicaCategorizacao = this.despesas.length > 3 && !this.usuarioCategorizouEsteMes;
    }

    private isCategoriaTipoOuNatureza(id: string): boolean {
        const cat = this.despesaService.todasCategorias.find(c => c.id === id);
        if (!cat) return true;
        if (!cat.categoriaPaiId) return true;
        const pai = this.despesaService.todasCategorias.find(c => c.id === cat.categoriaPaiId);
        return !pai?.categoriaPaiId;
    }

    verificarBadgeOrganizador() {
        if (this.despesas.length >= 10 && this.usuarioCategorizouEsteMes && !this.badgeOrganizadorDesbloqueado) {
            this.badgeOrganizadorDesbloqueado = true;
            this.celebrarBadge('Organizador Financeiro');
        }
    }

    private celebrarBadge(nome: string) {
        Swal.fire({
            icon: 'success', title: 'Conquista!', html: `<strong>${nome}</strong><br><small>10+ despesas categorizadas!</small>`,
            timer: 3000, showConfirmButton: false, background: '#fff8e1'
        });
    }

    // ==============================================================
    // HOVER
    // ==============================================================

    mostrarDicaHover(despesa: Despesa) {
        if (!despesa.idCategoria || this.isCategoriaTipoOuNatureza(despesa.idCategoria)) {
            this.dicaDespesaHover = despesa;
        }
    }

    esconderDicaHover() {
        this.dicaDespesaHover = null;
    }

    // ==============================================================
    // UTIL
    // ==============================================================

    obterNomeCategoria(id: string): string {
        return this.despesaService.todasCategorias.find(c => c.id === id)?.descricao || 'Sem categoria';
    }

    calcularMediaDiaria(): number {
        const diasDoMes = this.obterDiasDoMes();
        return diasDoMes > 0 ? this.totalDespesas / diasDoMes : 0;
    }

    obterValorLiquidoDespesa(despesa: Despesa): number {
        return despesa.valorLiquido ?? Math.max(despesa.valor - (despesa.valorReembolsado ?? 0), 0);
    }

    obterDiasDoMes(): number {
        return new Date(
            this.mesAtual.getFullYear(),
            this.mesAtual.getMonth() + 1,
            0
        ).getDate();
    }

    private atualizarMensagemCarregamento(): void {
        this.mensagemCarregamento = financialStateMessage(this.estadoCarregamento, this.mesAtual, 'despesas');
    }
}
