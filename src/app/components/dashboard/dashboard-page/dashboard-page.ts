import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ReceitaService, Receita } from '../../../services/receita';
import { DespesaService, Despesa } from '../../../services/despesa';

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [CommonModule, DecimalPipe],
    templateUrl: './dashboard-page.html',
    styleUrls: ['./dashboard-page.css']
})
export class DashboardPageComponent implements OnInit {

    receitas: Receita[] = [];
    despesas: Despesa[] = [];
    resumo = { receitas: 0, despesas: 0, sobrou: 0 };
    mesAtual = new Date();
    saldo = 0;

    constructor(
        private router: Router,
        private receitaService: ReceitaService,
        private despesaService: DespesaService
    ) { }

    ngOnInit(): void {
        this.carregarDadosMesAtual();
    }

    carregarDadosMesAtual() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();

        this.receitaService.obterPorReferencia(mes, ano).subscribe({
            next: (receitas) => {
                this.receitas = receitas;
                this.atualizarSaldo();
            },
            error: (erro) => {
                console.error('Erro ao carregar receitas:', erro);
            }
        });

        this.despesaService.obterPorReferencia(mes, ano).subscribe({
            next: (despesas) => {
                this.despesas = despesas;
                this.atualizarSaldo();
            },
            error: (erro) => {
                console.error('Erro ao carregar despesas:', erro);
            }
        });
    }

    atualizarSaldo() {
        const totalReceitas = this.receitas.reduce((soma, r) => soma + r.valor, 0);
        const totalDespesas = this.despesas.reduce((soma, d) => soma + d.valor, 0);
        this.saldo = totalReceitas - totalDespesas;

        this.resumo = {
            receitas: totalReceitas,
            despesas: totalDespesas,
            sobrou: this.saldo
        };
    }

    adicionarReceita(): void {
        this.router.navigate(['/receitas']);
    }

    adicionarDespesa(): void {
        this.router.navigate(['/despesas']);
    }

    mesAnterior() {
        const data = new Date(this.mesAtual);
        data.setMonth(data.getMonth() - 1);
        this.mesAtual = data;
        this.carregarDadosMesAtual();
    }

    proximoMes() {
        const data = new Date(this.mesAtual);
        data.setMonth(data.getMonth() + 1);
        this.mesAtual = data;
        this.carregarDadosMesAtual();
    }

}