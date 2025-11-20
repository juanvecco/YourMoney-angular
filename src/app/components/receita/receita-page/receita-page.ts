import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReceitaService, Receita } from '../../../services/receita';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';

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

    // === FORMULÁRIO ===
    novaReceita = {
        id: '',
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0]
    };

    editando = false;

    // === GAMIFICAÇÃO ===
    usuarioCategorizouEsteMes = false;

    // === CALENDÁRIO ===
    @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

    constructor(private receitaService: ReceitaService) { }

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

        this.receitaService.obterPorReferencia(mes, ano)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dados) => {
                    this.receitas = dados.sort((a, b) =>
                        new Date(b.data).getTime() - new Date(a.data).getTime()
                    );
                    this.totalReceitas = dados.reduce((soma, d) => soma + d.valor, 0);
                    this.verificarTrilhaCrescimento();
                },
                error: (erro) => console.error('Erro ao carregar receitas', erro)
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
            data: new Date(receita.data).toISOString().split('T')[0]
        };
        this.abrirModal();
    }

    private abrirModal() {
        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalReceita'));
        modal.show();
    }

    private resetForm() {
        this.novaReceita = {
            id: '', descricao: '', valor: 0, data: new Date().toISOString().split('T')[0]
        };
    }

    // === SALVAR ===
    salvarReceita() {
        if (!this.camposObrigatoriosPreenchidos()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const request$ = this.editando
            ? this.receitaService.atualizarReceita(this.novaReceita)
            : this.receitaService.criarReceita(this.novaReceita);

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
        return !!(this.novaReceita.descricao && this.novaReceita.valor > 0 && this.novaReceita.data);
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
}