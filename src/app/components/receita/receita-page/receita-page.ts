import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ReceitaService } from '../../../services/receita';
import { NaturezaReceita, Receita } from '../../../models/receita.model';
import { Despesa } from '../../../models/despesa.model';
import { DespesaService } from '../../../services/despesa';
import Swal from 'sweetalert2';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';

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

    // === TRILHA ===
    verificarTrilhaCrescimento() {
        this.usuarioCategorizouEsteMes = this.receitas.length > 0;
    }

    private atualizarMensagemCarregamento(): void {
        this.mensagemCarregamento = financialStateMessage(this.estadoCarregamento, this.mesAtual, 'receitas');
    }
}
