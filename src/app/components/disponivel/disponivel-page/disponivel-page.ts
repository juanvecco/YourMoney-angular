import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Receita, ReceitaService } from "../../../services/receita";
import { Despesa, DespesaService } from "../../../services/despesa";
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';

@Component({
    selector: "app-disponivel-page",
    imports: [CommonModule, FormsModule],
    templateUrl: "./disponivel-page.html"
})
export class DisponivelPageComponent {
    receitas: Receita[] = [];
    despesas: Despesa[] = [];
    mesAtual: Date = new Date();
    estadoReceitas: FinancialViewState = 'loading';
    estadoDespesas: FinancialViewState = 'loading';
    mensagemCarregamento = '';

    mudarMes(direcao: number) {
        const novoMes = new Date(this.mesAtual);
        novoMes.setMonth(novoMes.getMonth() + direcao);
        this.mesAtual = novoMes;
        this.carregarDados();
    }

    carregarDados() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.receitas = [];
        this.despesas = [];
        this.estadoReceitas = 'loading';
        this.estadoDespesas = 'loading';
        this.atualizarMensagemCarregamento();
        this.obterReceitas(mes, ano);
        this.obterDespesas(mes, ano);
    }

    constructor(
        private receitaService: ReceitaService,
        private despesaService: DespesaService,
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.carregarDados();
    }

    obterReceitas(mes: number, ano: number) {
        this.receitaService.obterPorReferencia(mes, ano).subscribe({
            next: (receitas) => {
                this.receitas = receitas;
                this.estadoReceitas = receitas.length > 0 ? 'loadedWithData' : 'emptyPeriod';
                this.atualizarMensagemCarregamento();
            },
            error: (erro) => {
                console.error('Erro ao carregar receitas', erro);
                this.receitas = [];
                this.estadoReceitas = 'loadError';
                this.atualizarMensagemCarregamento();
            }
        });
    }

    obterDespesas(mes: number, ano: number) {
        this.despesaService.obterPorReferencia(mes, ano).subscribe({
            next: (despesas) => {
                this.despesas = despesas;
                this.estadoDespesas = despesas.length > 0 ? 'loadedWithData' : 'emptyPeriod';
                this.atualizarMensagemCarregamento();
            },
            error: (erro) => {
                console.error('Erro ao carregar despesas', erro);
                this.despesas = [];
                this.estadoDespesas = 'loadError';
                this.atualizarMensagemCarregamento();
            }
        });
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    calcularDisponivel(): number {
        const totalReceitas = this.receitas.reduce((soma, r) => soma + r.valor, 0);
        const totalDespesas = this.despesas.reduce((soma, d) => soma + d.valor, 0);
        return totalReceitas - totalDespesas;
    }
    formatarValor(valor: number): string {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    formatarData(data: string): string {
        const dataObj = new Date(data);
        return dataObj.toLocaleDateString('pt-BR');
    }
    obterCorDisponivel(): string {
        const disponivel = this.calcularDisponivel();
        return disponivel >= 0 ? 'text-success' : 'text-danger';
    }
    obterIconeDisponivel(): string {
        const disponivel = this.calcularDisponivel();
        return disponivel >= 0 ? 'bi bi-arrow-up-circle' : 'bi bi-arrow-down-circle';
    }
    obterTextoDisponivel(): string {
        const disponivel = this.calcularDisponivel();
        return disponivel >= 0 ? 'Disponível' : 'Negativo';
    }

    abrirModalInvestimento() {
        Swal.fire({
            title: 'Investir Disponível',
            text: `Deseja investir ${this.formatarValor(this.calcularDisponivel())}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sim, investir',
            cancelButtonText: 'Cancelar'
        }).then(result => {
            if (result.isConfirmed) {
                // Aqui você pode chamar um serviço de investimento
                Swal.fire('Investido!', 'Seu valor foi direcionado para investimento.', 'success');
            }
        });
    }

    private atualizarMensagemCarregamento(): void {
        if (this.estadoReceitas === 'loadError' || this.estadoDespesas === 'loadError') {
            this.mensagemCarregamento = financialStateMessage('loadError', this.mesAtual, 'o saldo disponível');
            return;
        }

        if (this.estadoReceitas === 'loading' || this.estadoDespesas === 'loading') {
            this.mensagemCarregamento = financialStateMessage('loading', this.mesAtual, 'o saldo disponível');
            return;
        }

        if (this.receitas.length === 0 && this.despesas.length === 0) {
            this.mensagemCarregamento = financialStateMessage('emptyPeriod', this.mesAtual, 'receitas ou despesas');
            return;
        }

        this.mensagemCarregamento = '';
    }
}
