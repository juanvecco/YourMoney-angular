import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReceitaService, Receita } from '../../../services/receita';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';

@Component({
    selector: 'app-receita-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './receita-page.html',
    styleUrls: ['./receita-page.scss']
})
export class ReceitaPageComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // === DADOS ===
    receitas: Receita[] = [];
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
        mesReferencia: this.obterMesReferenciaInput(new Date())
    };

    editando = false;

    // === GAMIFICAÇÃO ===
    usuarioCategorizouEsteMes = false;

    // === CALENDÁRIO ===
    @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

    constructor(
        private receitaService: ReceitaService,
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

    mudarMes(direcao: number) {
        const novoMes = new Date(this.mesAtual);
        novoMes.setMonth(novoMes.getMonth() + direcao);
        this.mesAtual = novoMes;
        this.carregarReceitas();
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
            mesReferencia: this.obterMesReferenciaInput(receita.mesReferencia || receita.data)
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
            mesReferencia: this.obterMesReferenciaInput(this.mesAtual)
        };
    }

    // === SALVAR ===
    salvarReceita() {
        if (!this.camposObrigatoriosPreenchidos()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const payload = {
            ...this.novaReceita,
            mesReferencia: this.converterMesReferenciaParaApi(this.novaReceita.mesReferencia)
        };

        const request$ = this.editando
            ? this.receitaService.atualizarReceita(payload)
            : this.receitaService.criarReceita(payload);

        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.fecharModal();
                this.carregarReceitas();
                this.mostrarSucesso();
            },
            error: () => this.mostrarErro()
        });
    }

    private camposObrigatoriosPreenchidos(): boolean {
        return !!(
            this.novaReceita.descricao &&
            this.novaReceita.valor > 0 &&
            this.novaReceita.data &&
            this.novaReceita.mesReferencia
        );
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

    private mostrarErro() {
        Swal.fire({ icon: 'error', title: 'Erro!', text: 'Não foi possível salvar.', confirmButtonColor: '#dc3545' });
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
