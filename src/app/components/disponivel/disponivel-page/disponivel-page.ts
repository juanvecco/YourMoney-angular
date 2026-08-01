import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReceitaService } from "../../../services/receita";
import { Receita } from "../../../models/receita.model";
import { Despesa, DespesaService } from "../../../services/despesa";
import { AuthService } from '../../../services/auth.service';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';
import { MonthPickerComponent } from '../../shared/month-picker/month-picker';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ViewStateComponent } from '../../shared/view-state/view-state';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';

@Component({
    selector: "app-disponivel-page",
    imports: [CommonModule, FormsModule, MonthPickerComponent, PageHeaderComponent, ViewStateComponent],
    templateUrl: "./disponivel-page.html"
})
export class DisponivelPageComponent {
    private loadRevision = 0;
    receitas: Receita[] = [];
    despesas: Despesa[] = [];
    mesAtual: Date = new Date();
    estadoReceitas: FinancialViewState = 'loading';
    estadoDespesas: FinancialViewState = 'loading';
    mensagemCarregamento = '';

    mudarMes(direcao: number) {
        this.financialContext.setPeriod(this.mesAtual);
        this.financialContext.shiftPeriod(direcao);
        this.selecionarMes(this.financialContext.period().date);
    }

    selecionarMes(periodo: Date): void {
        this.financialContext.setPeriod(periodo);
        this.mesAtual = this.financialContext.period().date;
        this.carregarDados();
    }

    get estadoDaPagina(): FinancialViewState {
        if (this.estadoReceitas === 'loadError' || this.estadoDespesas === 'loadError') return 'loadError';
        if (this.estadoReceitas === 'loading' || this.estadoDespesas === 'loading') return 'loading';
        if (this.receitas.length === 0 && this.despesas.length === 0) return 'emptyPeriod';
        return 'loadedWithData';
    }

    carregarDados() {
        const revision = ++this.loadRevision;
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.receitas = [];
        this.despesas = [];
        this.estadoReceitas = 'loading';
        this.estadoDespesas = 'loading';
        this.atualizarMensagemCarregamento();
        this.obterReceitas(mes, ano, revision);
        this.obterDespesas(mes, ano, revision);
    }

    constructor(
        private receitaService: ReceitaService,
        private despesaService: DespesaService,
        private authService: AuthService,
        private router: Router,
        private financialContext: FinancialNavigationContextService = new FinancialNavigationContextService()
    ) {
        this.mesAtual = this.financialContext.period().date;
    }

    ngOnInit(): void {
        this.carregarDados();
    }

    obterReceitas(mes: number, ano: number, revision = this.loadRevision) {
        this.receitaService.obterPorReferencia(mes, ano).subscribe({
            next: (receitas) => {
                if (revision !== this.loadRevision) return;
                this.receitas = receitas;
                this.estadoReceitas = receitas.length > 0 ? 'loadedWithData' : 'emptyPeriod';
                this.atualizarMensagemCarregamento();
            },
            error: (erro) => {
                if (revision !== this.loadRevision) return;
                console.error('Erro ao carregar receitas', erro);
                this.receitas = [];
                this.estadoReceitas = 'loadError';
                this.atualizarMensagemCarregamento();
            }
        });
    }

    obterDespesas(mes: number, ano: number, revision = this.loadRevision) {
        this.despesaService.obterPorReferencia(mes, ano).subscribe({
            next: (despesas) => {
                if (revision !== this.loadRevision) return;
                this.despesas = despesas;
                this.estadoDespesas = despesas.length > 0 ? 'loadedWithData' : 'emptyPeriod';
                this.atualizarMensagemCarregamento();
            },
            error: (erro) => {
                if (revision !== this.loadRevision) return;
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
        this.router.navigate(['/investimento']);
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
