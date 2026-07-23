import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ReceitaService } from '../../../services/receita';
import { NaturezaReceita, Receita } from '../../../models/receita.model';
import { ContaFinanceira, Despesa } from '../../../models/despesa.model';
import { DespesaService } from '../../../services/despesa';
import { ReceitaRecorrenteService } from '../../../services/receita-recorrente';
import {
    ConfirmarSugestaoReceitaRecorrenteRequest,
    ProjecaoReservaEmergenciaItem,
    ReceitaRecorrenteRequest,
    ReceitaRecorrenteResponse,
    SugestaoReceitaRecorrenteResponse
} from '../../../models/receita-recorrente.model';
import Swal from 'sweetalert2';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';

type ReceitaRecorrenteForm = {
    descricao: string;
    valorPrevisto: number;
    idContaFinanceira: string;
    natureza: Exclude<NaturezaReceita, 'Reembolso'>;
    ehSalario: boolean;
    consideraReservaEmergencia: boolean;
    dataRecebimento: string;
    dataInicio: string;
    dataTermino: string;
};

type ConfirmacaoSugestaoReceitaForm = {
    descricao: string;
    valor: number;
    data: string;
    idContaFinanceira: string;
    natureza: Exclude<NaturezaReceita, 'Reembolso'>;
};

@Component({
    selector: 'app-receita-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './receita-page.html',
    styleUrls: ['./receita-page.scss']
})
export class ReceitaPageComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // === DADOS ===
    receitas: Receita[] = [];
    despesasVinculaveis: Despesa[] = [];
    mesAtual: Date = new Date();
    totalReceitas = 0;
    estadoCarregamento: FinancialViewState = 'loading';
    mensagemCarregamento = '';
    contas: ContaFinanceira[] = [];

    recorrencias: ReceitaRecorrenteResponse[] = [];
    sugestoesRecorrentes: SugestaoReceitaRecorrenteResponse[] = [];
    projecoesReserva: ProjecaoReservaEmergenciaItem[] = [];
    carregandoRecorrencias = false;
    carregandoSugestoesRecorrentes = false;
    carregandoProjecaoReserva = false;
    erroRecorrencias = false;
    erroSugestoesRecorrentes = false;
    erroProjecaoReserva = false;
    salvandoRecorrencia = false;
    salvandoSugestaoRecorrente = false;
    recorrenciaEditandoId = '';
    sugestaoEmEdicaoId = '';
    novaRecorrencia: ReceitaRecorrenteForm = this.criarFormularioRecorrencia();
    confirmacaoSugestao: ConfirmacaoSugestaoReceitaForm = this.criarFormularioSugestao();

    // === FORMULÁRIO ===
    novaReceita = {
        id: '',
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        mesReferencia: this.obterMesReferenciaInput(new Date()),
        natureza: 'RendaDisponivel' as NaturezaReceita,
        despesaVinculadaId: ''
    };

    editando = false;
    salvandoReceita = false;

    // === GAMIFICAÇÃO ===
    usuarioCategorizouEsteMes = false;

    // === CALENDÁRIO ===
    @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

    constructor(
        private receitaService: ReceitaService,
        private despesaService: DespesaService,
        private receitaRecorrenteService: ReceitaRecorrenteService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit() {
        this.carregarDadosIniciais();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    carregarDadosIniciais() {
        this.carregarReceitas();
        this.carregarDespesasVinculaveis();
        this.carregarContas();
        this.carregarRecorrencias();
        this.carregarSugestoesRecorrentes();
        this.carregarProjecaoReserva();
    }

    carregarContas() {
        this.despesaService.listarContas()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: contas => this.contas = contas,
                error: () => this.contas = []
            });
    }

    carregarRecorrencias() {
        this.carregandoRecorrencias = true;
        this.erroRecorrencias = false;
        this.receitaRecorrenteService.listar()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: response => {
                    this.recorrencias = response.itens ?? [];
                    this.carregandoRecorrencias = false;
                },
                error: () => {
                    this.recorrencias = [];
                    this.carregandoRecorrencias = false;
                    this.erroRecorrencias = true;
                }
            });
    }

    carregarSugestoesRecorrentes() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.carregandoSugestoesRecorrentes = true;
        this.erroSugestoesRecorrentes = false;
        this.receitaRecorrenteService.listarSugestoes(mes, ano)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: response => {
                    this.sugestoesRecorrentes = response.itens ?? [];
                    this.carregandoSugestoesRecorrentes = false;
                    this.cancelarEdicaoSugestao();
                },
                error: () => {
                    this.sugestoesRecorrentes = [];
                    this.carregandoSugestoesRecorrentes = false;
                    this.erroSugestoesRecorrentes = true;
                }
            });
    }

    carregarProjecaoReserva() {
        this.carregandoProjecaoReserva = true;
        this.erroProjecaoReserva = false;
        this.receitaRecorrenteService.obterProjecaoReserva()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: response => {
                    this.projecoesReserva = response.itens ?? [];
                    this.carregandoProjecaoReserva = false;
                },
                error: () => {
                    this.projecoesReserva = [];
                    this.carregandoProjecaoReserva = false;
                    this.erroProjecaoReserva = true;
                }
            });
    }

    carregarReceitas() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.receitas = [];
        this.totalReceitas = 0;
        this.estadoCarregamento = 'loading';
        this.atualizarMensagemCarregamento();

        this.receitaService.obterPorReferencia(mes, ano)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dados) => {
                    this.receitas = dados.sort((a, b) =>
                        new Date(b.data).getTime() - new Date(a.data).getTime()
                    );
                    this.totalReceitas = dados.reduce((soma, d) => soma + d.valor, 0);
                    this.estadoCarregamento = this.receitas.length > 0 ? 'loadedWithData' : 'emptyPeriod';
                    this.atualizarMensagemCarregamento();
                    this.verificarTrilhaCrescimento();
                },
                error: (erro) => {
                    console.error('Erro ao carregar receitas', erro);
                    this.receitas = [];
                    this.totalReceitas = 0;
                    this.estadoCarregamento = 'loadError';
                    this.atualizarMensagemCarregamento();
                }
            });
    }

    carregarDespesasVinculaveis() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();

        this.despesaService.obterPorReferencia(mes, ano)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (despesas) => this.despesasVinculaveis = despesas,
                error: () => this.despesasVinculaveis = []
            });
    }

    mudarMes(direcao: number) {
        const novoMes = new Date(this.mesAtual);
        novoMes.setMonth(novoMes.getMonth() + direcao);
        this.mesAtual = novoMes;
        this.carregarReceitas();
        this.carregarDespesasVinculaveis();
        this.carregarSugestoesRecorrentes();
    }

    // === CALENDÁRIO ===
    abrirCalendario() {
        const input = this.calendarioInput.nativeElement;
        if (typeof input.showPicker === 'function') {
            input.showPicker();
        } else {
            input.click();
        }
    }

    selecionarMesDoCalendario(event: Event) {
        const input = event.target as HTMLInputElement;
        const [ano, mes] = input.value.split('-').map(Number);
        this.mesAtual = new Date(ano, mes - 1, 1);
        this.carregarReceitas();
        this.carregarDespesasVinculaveis();
        this.carregarSugestoesRecorrentes();
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    // === MODAL ===
    abrirModalReceita() {
        this.editando = false;
        this.resetForm();
        this.abrirModal();
    }

    abrirModalEditar(receita: Receita) {
        this.editando = true;
        this.novaReceita = {
            ...receita,
            data: new Date(receita.data).toISOString().split('T')[0],
            mesReferencia: this.obterMesReferenciaInput(receita.mesReferencia || receita.data),
            natureza: receita.natureza ?? 'RendaDisponivel',
            despesaVinculadaId: receita.despesaVinculadaId ?? ''
        };
        this.abrirModal();
    }

    private abrirModal() {
        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalReceita'));
        modal.show();
    }

    private resetForm() {
        this.novaReceita = {
            id: '',
            descricao: '',
            valor: 0,
            data: new Date().toISOString().split('T')[0],
            mesReferencia: this.obterMesReferenciaInput(this.mesAtual),
            natureza: 'RendaDisponivel',
            despesaVinculadaId: ''
        };
    }

    // === SALVAR ===
    salvarReceita() {
        if (this.salvandoReceita) return;

        if (!this.camposObrigatoriosPreenchidos()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const payload = {
            descricao: this.novaReceita.descricao.trim(),
            valor: this.novaReceita.valor,
            data: this.novaReceita.data,
            mesReferencia: this.converterMesReferenciaParaApi(this.novaReceita.mesReferencia),
            natureza: this.novaReceita.natureza,
            despesaVinculadaId: this.novaReceita.natureza === 'Reembolso'
                ? this.novaReceita.despesaVinculadaId || null
                : null
        };

        const request$: Observable<Receita | void> = this.editando
            ? this.receitaService.atualizarReceita({ id: this.novaReceita.id, ...payload })
            : this.receitaService.criarReceita(payload);

        this.salvandoReceita = true;
        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: (response: Receita | void) => {
                if (!this.editando && response?.mesReferencia) {
                    const referencia = this.obterMesReferenciaInput(response.mesReferencia);
                    const [ano, mes] = referencia.split('-').map(Number);
                    this.mesAtual = new Date(ano, mes - 1, 1);
                }
                this.fecharModal();
                this.carregarReceitas();
                this.carregarDespesasVinculaveis();
                this.mostrarSucesso();
                this.salvandoReceita = false;
            },
            error: (error: unknown) => {
                this.salvandoReceita = false;
                this.mostrarErro(error);
            }
        });
    }

    private camposObrigatoriosPreenchidos(): boolean {
        return !!(
            this.novaReceita.descricao.trim() &&
            this.novaReceita.valor > 0 &&
            this.novaReceita.data &&
            this.novaReceita.mesReferencia &&
            this.novaReceita.natureza &&
            (this.novaReceita.natureza !== 'Reembolso' || !!this.novaReceita.despesaVinculadaId)
        );
    }

    onNaturezaReceitaChange() {
        if (this.novaReceita.natureza !== 'Reembolso') {
            this.novaReceita.despesaVinculadaId = '';
        }
    }

    obterNaturezaTexto(natureza?: NaturezaReceita): string {
        const rotulos: Record<NaturezaReceita, string> = {
            RendaDisponivel: 'Renda disponível',
            EntradaVinculadaDespesa: 'Destinada a despesa',
            Reembolso: 'Reembolso'
        };
        return rotulos[natureza ?? 'RendaDisponivel'];
    }

    obterNaturezaClasse(natureza?: NaturezaReceita): string {
        const classes: Record<NaturezaReceita, string> = {
            RendaDisponivel: 'ym-chip receita-natureza natureza-disponivel',
            EntradaVinculadaDespesa: 'ym-chip receita-natureza natureza-vinculada',
            Reembolso: 'ym-chip receita-natureza natureza-reembolso'
        };
        return classes[natureza ?? 'RendaDisponivel'];
    }

    obterImpactoMetas(receita: Receita): string {
        if (receita.consideraNasMetas) return 'Entra na base das metas';
        if (receita.natureza === 'Reembolso') return 'Fora das metas e abate uma despesa';
        return 'Fora das metas';
    }

    obterDespesaSelecionada(): Despesa | undefined {
        return this.despesasVinculaveis.find(d => d.id === this.novaReceita.despesaVinculadaId);
    }

    obterValorPendenteDespesa(despesa: Despesa): number {
        return despesa.valorLiquido ?? Math.max(despesa.valor - (despesa.valorReembolsado ?? 0), 0);
    }

    obterMesReferenciaTexto(mesReferencia?: string): string {
        if (!mesReferencia) return 'Sem referência';

        const data = new Date(`${this.obterMesReferenciaInput(mesReferencia)}-01T00:00:00`);
        return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
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

    private converterMesReferenciaParaApi(mesReferencia: string): string {
        return `${mesReferencia}-01`;
    }

    private mostrarAlertaCamposObrigatorios() {
        Swal.fire({ icon: 'warning', title: 'Campos obrigatórios!', text: 'Preencha todos os campos.', confirmButtonColor: '#d4af37' });
    }

    private mostrarSucesso() {
        Swal.fire({ icon: 'success', title: this.editando ? 'Atualizada!' : 'Cadastrada!', timer: 2000, showConfirmButton: false });
    }

    private mostrarErro(error: unknown) {
        const httpError = error instanceof HttpErrorResponse ? error : null;
        Swal.fire({
            icon: 'error',
            title: 'Erro!',
            text: this.obterMensagemErro(httpError),
            confirmButtonColor: '#dc3545'
        });
    }

    private obterMensagemErro(error: HttpErrorResponse | null): string {
        if (!error) return 'Não foi possível salvar.';
        if (error.status === 400) {
            if (typeof error.error?.message === 'string') return error.error.message;
            const errors = error.error?.errors;
            if (errors && typeof errors === 'object') {
                const first = Object.values(errors).flat().find(value => typeof value === 'string');
                if (typeof first === 'string') return first;
            }
            return 'Revise os dados informados.';
        }
        if (error.status === 401) return 'Sua sessão expirou. Entre novamente.';
        if (error.status === 403) return 'Você não tem permissão para salvar esta receita.';
        if ([0, 502, 503, 504].includes(error.status)) {
            return 'Serviço temporariamente indisponível. Tente novamente.';
        }
        return 'Não foi possível salvar a receita.';
    }

    private fecharModal() {
        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('modalReceita'));
        modal?.hide();
    }

    deletarReceita(id: string) {
        Swal.fire({
            title: 'Deletar?', text: 'Não pode ser desfeito.', icon: 'warning',
            showCancelButton: true, confirmButtonText: 'Sim', cancelButtonText: 'Não',
            confirmButtonColor: '#dc3545'
        }).then(result => {
            if (result.isConfirmed) {
                this.receitaService.deletarReceita(id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.receitas = this.receitas.filter(d => d.id !== id);
                            this.totalReceitas = this.receitas.reduce((s, d) => s + d.valor, 0);
                            Swal.fire('Deletado!', '', 'success');
                        },
                        error: () => Swal.fire('Erro!', '', 'error')
                    });
            }
        });
    }

    abrirModalRecorrencia(recorrencia?: ReceitaRecorrenteResponse) {
        this.recorrenciaEditandoId = recorrencia?.id ?? '';
        this.novaRecorrencia = this.criarFormularioRecorrencia(recorrencia);
        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalReceitaRecorrente'));
        modal.show();
    }

    salvarRecorrencia() {
        if (this.salvandoRecorrencia) return;
        if (!this.recorrenciaValida()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const payload: ReceitaRecorrenteRequest = {
            descricao: this.novaRecorrencia.descricao.trim(),
            valorPrevisto: this.novaRecorrencia.valorPrevisto,
            idContaFinanceira: this.novaRecorrencia.idContaFinanceira,
            natureza: this.novaRecorrencia.natureza,
            ehSalario: this.novaRecorrencia.ehSalario,
            consideraReservaEmergencia: this.novaRecorrencia.consideraReservaEmergencia,
            dataRecebimento: this.novaRecorrencia.dataRecebimento,
            dataInicio: this.novaRecorrencia.dataInicio,
            dataTermino: this.novaRecorrencia.dataTermino || null
        };
        const request$ = this.recorrenciaEditandoId
            ? this.receitaRecorrenteService.atualizar(this.recorrenciaEditandoId, payload)
            : this.receitaRecorrenteService.criar(payload);

        this.salvandoRecorrencia = true;
        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.salvandoRecorrencia = false;
                this.fecharModalPorId('modalReceitaRecorrente');
                this.carregarRecorrencias();
                this.carregarSugestoesRecorrentes();
                this.carregarProjecaoReserva();
                Swal.fire({
                    icon: 'success',
                    title: this.recorrenciaEditandoId ? 'Recorrência atualizada!' : 'Recorrência cadastrada!',
                    timer: 1800,
                    showConfirmButton: false
                });
            },
            error: (erro: unknown) => {
                this.salvandoRecorrencia = false;
                this.mostrarErroRecorrencia(erro, 'Não foi possível salvar a recorrência.');
            }
        });
    }

    recorrenciaValida(): boolean {
        return !!(
            this.novaRecorrencia.descricao.trim() &&
            this.novaRecorrencia.valorPrevisto > 0 &&
            this.novaRecorrencia.idContaFinanceira &&
            this.novaRecorrencia.natureza &&
            this.novaRecorrencia.dataRecebimento &&
            this.novaRecorrencia.dataInicio &&
            (!this.novaRecorrencia.dataTermino || this.novaRecorrencia.dataTermino >= this.novaRecorrencia.dataInicio)
        );
    }

    desativarRecorrencia(recorrencia: ReceitaRecorrenteResponse) {
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
            this.receitaRecorrenteService.desativar(recorrencia.id)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => this.recarregarVisoesRecorrentes('Recorrência desativada!'),
                    error: erro => this.mostrarErroRecorrencia(erro, 'Não foi possível desativar a recorrência.')
                });
        });
    }

    encerrarRecorrencia(recorrencia: ReceitaRecorrenteResponse) {
        Swal.fire({
            title: 'Encerrar recorrência',
            input: 'date',
            inputValue: this.normalizarDataInput(recorrencia.dataTermino) || this.normalizarDataInput(new Date()),
            showCancelButton: true,
            confirmButtonText: 'Encerrar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545'
        }).then(result => {
            if (!result.isConfirmed || !result.value) return;
            this.receitaRecorrenteService.encerrar(recorrencia.id, { dataTermino: result.value })
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => this.recarregarVisoesRecorrentes('Recorrência encerrada!'),
                    error: erro => this.mostrarErroRecorrencia(erro, 'Não foi possível encerrar a recorrência.')
                });
        });
    }

    editarSugestao(sugestao: SugestaoReceitaRecorrenteResponse) {
        if (sugestao.status !== 'Pendente') return;
        this.sugestaoEmEdicaoId = sugestao.ocorrenciaId;
        this.confirmacaoSugestao = this.criarFormularioSugestao(sugestao);
    }

    cancelarEdicaoSugestao() {
        this.sugestaoEmEdicaoId = '';
        this.confirmacaoSugestao = this.criarFormularioSugestao();
    }

    confirmarSugestao(sugestao: SugestaoReceitaRecorrenteResponse) {
        if (this.salvandoSugestaoRecorrente || sugestao.status !== 'Pendente') return;
        const editando = this.sugestaoEmEdicaoId === sugestao.ocorrenciaId;
        if (editando && !this.sugestaoEditadaValida()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const payload: ConfirmarSugestaoReceitaRecorrenteRequest = editando
            ? {
                descricao: this.confirmacaoSugestao.descricao.trim(),
                valor: this.confirmacaoSugestao.valor,
                data: this.confirmacaoSugestao.data,
                idContaFinanceira: this.confirmacaoSugestao.idContaFinanceira,
                natureza: this.confirmacaoSugestao.natureza
            }
            : {};

        this.salvandoSugestaoRecorrente = true;
        this.receitaRecorrenteService.confirmarSugestao(sugestao.ocorrenciaId, payload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.salvandoSugestaoRecorrente = false;
                    this.cancelarEdicaoSugestao();
                    this.carregarSugestoesRecorrentes();
                    this.carregarReceitas();
                    Swal.fire({ icon: 'success', title: 'Receita confirmada!', timer: 1800, showConfirmButton: false });
                },
                error: erro => {
                    this.salvandoSugestaoRecorrente = false;
                    this.mostrarErroRecorrencia(erro, 'Não foi possível confirmar a sugestão.');
                }
            });
    }

    ignorarSugestao(sugestao: SugestaoReceitaRecorrenteResponse) {
        if (this.salvandoSugestaoRecorrente || sugestao.status !== 'Pendente') return;
        Swal.fire({
            title: 'Ignorar sugestão?',
            text: 'Somente esta sugestão mensal será ignorada.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ignorar',
            cancelButtonText: 'Voltar',
            confirmButtonColor: '#dc3545'
        }).then(result => {
            if (!result.isConfirmed) return;
            this.salvandoSugestaoRecorrente = true;
            this.receitaRecorrenteService.ignorarSugestao(sugestao.ocorrenciaId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: () => {
                        this.salvandoSugestaoRecorrente = false;
                        this.cancelarEdicaoSugestao();
                        this.carregarSugestoesRecorrentes();
                    },
                    error: erro => {
                        this.salvandoSugestaoRecorrente = false;
                        this.mostrarErroRecorrencia(erro, 'Não foi possível ignorar a sugestão.');
                    }
                });
        });
    }

    obterStatusSugestaoClasse(status: string): string {
        return {
            Pendente: 'ym-status-pendente',
            Confirmada: 'ym-status-confirmada',
            Ignorada: 'ym-status-ignorada'
        }[status] ?? 'ym-status-pendente';
    }

    obterTotalSugestoesPendentes(): number {
        return this.sugestoesRecorrentes
            .filter(sugestao => sugestao.status === 'Pendente')
            .reduce((total, sugestao) => total + sugestao.valorPrevisto, 0);
    }

    get totalReservaMensal(): number {
        return this.projecoesReserva.reduce((total, item) => total + item.valorMensal, 0);
    }

    get totalReservaSeisMeses(): number {
        return this.projecoesReserva.reduce((total, item) => total + item.valorSeisMeses, 0);
    }

    get totalReservaDozeMeses(): number {
        return this.projecoesReserva.reduce((total, item) => total + item.valorDozeMeses, 0);
    }

    private criarFormularioRecorrencia(recorrencia?: ReceitaRecorrenteResponse): ReceitaRecorrenteForm {
        return {
            descricao: recorrencia?.descricao ?? '',
            valorPrevisto: recorrencia?.valorPrevisto ?? 0,
            idContaFinanceira: recorrencia?.idContaFinanceira ?? '',
            natureza: recorrencia?.natureza ?? 'RendaDisponivel',
            ehSalario: recorrencia?.ehSalario ?? false,
            consideraReservaEmergencia: recorrencia?.consideraReservaEmergencia ?? false,
            dataRecebimento: recorrencia
                ? this.montarDataNoMesAtual(recorrencia.diaRecebimento)
                : this.normalizarDataInput(new Date()),
            dataInicio: this.normalizarDataInput(recorrencia?.dataInicio) || this.converterMesReferenciaParaApi(this.obterMesReferenciaInput(this.mesAtual)),
            dataTermino: this.normalizarDataInput(recorrencia?.dataTermino)
        };
    }

    private criarFormularioSugestao(sugestao?: SugestaoReceitaRecorrenteResponse): ConfirmacaoSugestaoReceitaForm {
        return {
            descricao: sugestao?.descricao ?? '',
            valor: sugestao?.valorPrevisto ?? 0,
            data: this.normalizarDataInput(sugestao?.dataSugerida),
            idContaFinanceira: sugestao?.idContaFinanceira ?? '',
            natureza: sugestao?.natureza ?? 'RendaDisponivel'
        };
    }

    private sugestaoEditadaValida(): boolean {
        return !!(
            this.confirmacaoSugestao.descricao.trim() &&
            this.confirmacaoSugestao.valor > 0 &&
            this.confirmacaoSugestao.data &&
            this.confirmacaoSugestao.idContaFinanceira &&
            this.confirmacaoSugestao.natureza
        );
    }

    private montarDataNoMesAtual(dia: number): string {
        const ano = this.mesAtual.getFullYear();
        const mes = this.mesAtual.getMonth() + 1;
        const diaValido = Math.min(dia, new Date(ano, mes, 0).getDate());
        return `${ano}-${String(mes).padStart(2, '0')}-${String(diaValido).padStart(2, '0')}`;
    }

    private normalizarDataInput(data?: Date | string | null): string {
        if (!data) return '';
        if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}/.test(data)) return data.substring(0, 10);
        const valor = data instanceof Date ? data : new Date(data);
        return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
    }

    private fecharModalPorId(id: string) {
        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById(id));
        modal?.hide();
    }

    private recarregarVisoesRecorrentes(mensagem: string) {
        this.carregarRecorrencias();
        this.carregarSugestoesRecorrentes();
        this.carregarProjecaoReserva();
        Swal.fire({ icon: 'success', title: mensagem, timer: 1600, showConfirmButton: false });
    }

    private mostrarErroRecorrencia(erro: unknown, fallback: string) {
        const httpError = erro instanceof HttpErrorResponse ? erro : null;
        Swal.fire({
            icon: 'error',
            title: 'Erro!',
            text: typeof httpError?.error?.message === 'string' ? httpError.error.message : fallback,
            confirmButtonColor: '#dc3545'
        });
    }

    // === TRILHA ===
    verificarTrilhaCrescimento() {
        this.usuarioCategorizouEsteMes = this.receitas.length > 0;
    }

    private atualizarMensagemCarregamento(): void {
        this.mensagemCarregamento = financialStateMessage(this.estadoCarregamento, this.mesAtual, 'receitas');
    }
}
