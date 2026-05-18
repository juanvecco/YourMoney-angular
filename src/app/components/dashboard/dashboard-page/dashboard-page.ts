import { Component, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ReceitaService, Receita } from '../../../services/receita';
import { DespesaService, Despesa, Categoria } from '../../../services/despesa';
import { InvestimentoService, Investimento } from '../../../services/investimento';

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
    investimentos: Investimento[] = [];
    categorias: Categoria[] = [];
    despesasPorTipo: { descricao: string; valor: number }[] = [];
    despesasPorNatureza: { descricao: string; valor: number }[] = [];

    resumo = {
        receitas: 0,
        despesas: 0,
        investimentos: 0,
        sobrou: 0
    };

    mesAtual = new Date();

    constructor(
        private router: Router,
        private receitaService: ReceitaService,
        private despesaService: DespesaService,
        private investimentoService: InvestimentoService
    ) { }

    ngOnInit(): void {
        this.carregarDadosMesAtual();
    }

    carregarDadosMesAtual() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();

        this.despesaService.listarCategorias().subscribe({
            next: (categorias) => {
                this.categorias = categorias;
                this.atualizarAgrupamentosDespesa();
            },
            error: (erro) => console.error('Erro ao carregar categorias:', erro)
        });

        this.receitaService.obterPorReferencia(mes, ano).subscribe({
            next: (receitas) => {
                this.receitas = receitas;
                this.atualizarResumo();
            },
            error: (erro) => console.error('Erro ao carregar receitas:', erro)
        });

        this.despesaService.obterPorReferencia(mes, ano).subscribe({
            next: (despesas) => {
                this.despesas = despesas;
                this.atualizarResumo();
                this.atualizarAgrupamentosDespesa();
            },
            error: (erro) => {
                console.error('Erro ao carregar despesas:', erro);
            }
        });

        this.investimentoService.obterPorReferencia(mes, ano).subscribe({
            next: (investimentos) => {
                this.investimentos = investimentos;
                this.atualizarResumo();
            },
            error: (erro) => {
                console.error('Erro ao carregar investimentos:', erro);
            }
        });
    }

    atualizarResumo() {
        const totalReceitas = this.receitas.reduce((soma, r) => soma + r.valor, 0);
        const totalDespesas = this.despesas.reduce((soma, d) => soma + d.valor, 0);
        const totalInvestimentos = this.investimentos.reduce((soma, i) => soma + i.valorAtual, 0);
        this.resumo = {
            receitas: totalReceitas,
            despesas: totalDespesas,
            investimentos: totalInvestimentos,
            sobrou: totalReceitas - totalDespesas
        };
    }

    atualizarAgrupamentosDespesa() {
        const totalPorTipo = new Map<string, number>();
        const totalPorNatureza = new Map<string, number>();

        this.despesas.forEach((despesa) => {
            const hierarquia = this.obterHierarquiaCategoria(despesa.idCategoria);
            const tipo = hierarquia.tipo?.descricao || 'Sem tipo';
            const natureza = hierarquia.natureza?.descricao || 'Sem natureza';

            totalPorTipo.set(tipo, (totalPorTipo.get(tipo) || 0) + despesa.valor);
            totalPorNatureza.set(natureza, (totalPorNatureza.get(natureza) || 0) + despesa.valor);
        });

        this.despesasPorTipo = this.mapParaListaOrdenada(totalPorTipo);
        this.despesasPorNatureza = this.mapParaListaOrdenada(totalPorNatureza);
    }

    private obterHierarquiaCategoria(idCategoria: string): { tipo?: Categoria; natureza?: Categoria } {
        const categoria = this.categorias.find(c => c.id === idCategoria);
        if (!categoria) return {};

        if (!categoria.categoriaPaiId) {
            return { tipo: categoria };
        }

        const pai = this.categorias.find(c => c.id === categoria.categoriaPaiId);
        if (!pai) return {};

        if (!pai.categoriaPaiId) {
            return { tipo: pai, natureza: categoria };
        }

        const avo = this.categorias.find(c => c.id === pai.categoriaPaiId);
        return { tipo: avo, natureza: pai };
    }

    private mapParaListaOrdenada(totalMap: Map<string, number>): { descricao: string; valor: number }[] {
        return Array.from(totalMap, ([descricao, valor]) => ({ descricao, valor }))
            .sort((a, b) => b.valor - a.valor);
    }

    adicionarReceita(): void {
        this.router.navigate(['/receitas']);
    }

    adicionarDespesa(): void {
        this.router.navigate(['/despesas']);
    }

    verCarteira(): void {
        this.router.navigate(['/investimento']);
    }

    investir(): void {
        this.router.navigate(['/investimento']);
    }

    mesAnterior(): void {
        const data = new Date(this.mesAtual);
        data.setMonth(data.getMonth() - 1);
        this.mesAtual = data;
        this.carregarDadosMesAtual();
    }

    proximoMes(): void {
        const data = new Date(this.mesAtual);
        data.setMonth(data.getMonth() + 1);
        this.mesAtual = data;
        this.carregarDadosMesAtual();
    }
}
