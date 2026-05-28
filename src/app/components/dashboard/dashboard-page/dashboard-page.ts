import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';
import { ReceitaService, Receita } from '../../../services/receita';
import { DespesaService, Despesa, Categoria } from '../../../services/despesa';
import { InvestimentoService, Investimento } from '../../../services/investimento';
import { ItemGraficoFinanceiro, ResumoGraficoDashboard } from '../../../models/dashboard-grafico.model';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [CommonModule, DecimalPipe],
    templateUrl: './dashboard-page.html',
    styleUrls: ['./dashboard-page.css']
})
export class DashboardPageComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('graficoFinanceiroCanvas') graficoFinanceiroCanvas?: ElementRef<HTMLCanvasElement>;

    receitas: Receita[] = [];
    despesas: Despesa[] = [];
    investimentos: Investimento[] = [];
    categorias: Categoria[] = [];
    despesasPorTipo: { descricao: string; valor: number }[] = [];
    despesasPorNatureza: { descricao: string; valor: number }[] = [];
    resumoGrafico: ResumoGraficoDashboard = this.criarResumoGrafico([], [], [], new Date(), 'carregando');

    private graficoFinanceiro?: Chart;
    private viewInicializada = false;
    private statusCarregamentoGrafico: Record<'receitas' | 'despesas' | 'investimentos', 'carregando' | 'pronto' | 'erro'> = {
        receitas: 'carregando',
        despesas: 'carregando',
        investimentos: 'carregando'
    };

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
        private investimentoService: InvestimentoService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.carregarDadosMesAtual();
    }

    ngAfterViewInit(): void {
        this.viewInicializada = true;
        this.atualizarGraficoFinanceiro();
    }

    ngOnDestroy(): void {
        this.destruirGraficoFinanceiro();
    }

    carregarDadosMesAtual() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.statusCarregamentoGrafico = {
            receitas: 'carregando',
            despesas: 'carregando',
            investimentos: 'carregando'
        };
        this.resumoGrafico = this.criarResumoGrafico([], [], [], this.mesAtual, 'carregando');
        this.atualizarGraficoFinanceiro();

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
                this.statusCarregamentoGrafico.receitas = 'pronto';
                this.atualizarResumo();
                this.atualizarResumoGrafico();
            },
            error: (erro) => {
                console.error('Erro ao carregar receitas:', erro);
                this.statusCarregamentoGrafico.receitas = 'erro';
                this.atualizarResumoGrafico();
            }
        });

        this.despesaService.obterPorReferencia(mes, ano).subscribe({
            next: (despesas) => {
                this.despesas = despesas;
                this.statusCarregamentoGrafico.despesas = 'pronto';
                this.atualizarResumo();
                this.atualizarAgrupamentosDespesa();
                this.atualizarResumoGrafico();
            },
            error: (erro) => {
                console.error('Erro ao carregar despesas:', erro);
                this.statusCarregamentoGrafico.despesas = 'erro';
                this.atualizarResumoGrafico();
            }
        });

        this.investimentoService.obterPorReferencia(mes, ano).subscribe({
            next: (investimentos) => {
                this.investimentos = investimentos;
                this.statusCarregamentoGrafico.investimentos = 'pronto';
                this.atualizarResumo();
                this.atualizarResumoGrafico();
            },
            error: (erro) => {
                console.error('Erro ao carregar investimentos:', erro);
                this.statusCarregamentoGrafico.investimentos = 'erro';
                this.atualizarResumoGrafico();
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

    criarResumoGrafico(
        receitas: Receita[],
        despesas: Despesa[],
        investimentos: Investimento[],
        periodo: Date,
        estadoForcado?: ResumoGraficoDashboard['estado']
    ): ResumoGraficoDashboard {
        const totalReceitas = this.somarValores(receitas.map(receita => receita.valor));
        const totalDespesas = this.somarValores(despesas.map(despesa => despesa.valor));
        const totalInvestimentos = this.somarValores(investimentos.map(investimento => investimento.valorAtual));
        const saldo = totalReceitas - totalDespesas;

        const itensBase: ItemGraficoFinanceiro[] = [
            { id: 'receitas', rotulo: 'Receitas', tipo: 'receita', valor: totalReceitas, cor: '#16794c' },
            { id: 'despesas', rotulo: 'Despesas', tipo: 'despesa', valor: totalDespesas, cor: '#c2413a' },
            { id: 'investimentos', rotulo: 'Investimentos', tipo: 'investimento', valor: totalInvestimentos, cor: '#5d5fef' },
            { id: 'saldo', rotulo: saldo >= 0 ? 'Saldo positivo' : 'Saldo negativo', tipo: 'saldo', valor: Math.abs(saldo), cor: saldo >= 0 ? '#2563eb' : '#b45309' }
        ];

        const items = itensBase.filter(item => Number.isFinite(item.valor) && item.valor > 0);
        const total = this.arredondarMoeda(items.reduce((soma, item) => soma + item.valor, 0));
        const estado = estadoForcado ?? (items.length > 0 ? 'pronto' : 'vazio');

        return {
            periodoReferencia: {
                mes: periodo.getMonth() + 1,
                ano: periodo.getFullYear(),
                rotulo: periodo.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            },
            total,
            items: items.map(item => ({
                ...item,
                valor: this.arredondarMoeda(item.valor),
                percentual: total > 0 ? this.arredondarMoeda((item.valor / total) * 100) : 0
            })),
            estado,
            mensagemEstado: this.obterMensagemEstadoGrafico(estado)
        };
    }

    private atualizarResumoGrafico(): void {
        const status = Object.values(this.statusCarregamentoGrafico);
        if (status.includes('erro')) {
            this.resumoGrafico = this.criarResumoGrafico(this.receitas, this.despesas, this.investimentos, this.mesAtual, 'erro');
        } else if (status.includes('carregando')) {
            this.resumoGrafico = this.criarResumoGrafico(this.receitas, this.despesas, this.investimentos, this.mesAtual, 'carregando');
        } else {
            this.resumoGrafico = this.criarResumoGrafico(this.receitas, this.despesas, this.investimentos, this.mesAtual);
        }

        this.atualizarGraficoFinanceiro();
    }

    private atualizarGraficoFinanceiro(): void {
        if (!this.viewInicializada || !this.graficoFinanceiroCanvas) {
            return;
        }

        if (this.resumoGrafico.estado !== 'pronto' || this.resumoGrafico.items.length === 0) {
            this.destruirGraficoFinanceiro();
            return;
        }

        const configuracao = this.criarConfiguracaoGrafico();

        if (!this.graficoFinanceiro) {
            this.graficoFinanceiro = new Chart(this.graficoFinanceiroCanvas.nativeElement, configuracao);
            return;
        }

        this.graficoFinanceiro.data = configuracao.data;
        this.graficoFinanceiro.options = configuracao.options ?? {};
        this.graficoFinanceiro.update();
    }

    private criarConfiguracaoGrafico(): ChartConfiguration<'doughnut', number[], string> {
        return {
            type: 'doughnut',
            data: {
                labels: this.resumoGrafico.items.map(item => item.rotulo),
                datasets: [
                    {
                        data: this.resumoGrafico.items.map(item => item.valor),
                        backgroundColor: this.resumoGrafico.items.map(item => item.cor ?? '#64748b'),
                        borderColor: '#ffffff',
                        borderWidth: 3,
                        hoverOffset: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || 'Valor';
                                const value = typeof context.parsed === 'number' ? context.parsed : 0;
                                return `${label}: ${this.formatarMoeda(value)}`;
                            }
                        }
                    }
                },
                cutout: '62%'
            }
        };
    }

    private destruirGraficoFinanceiro(): void {
        this.graficoFinanceiro?.destroy();
        this.graficoFinanceiro = undefined;
    }

    private obterMensagemEstadoGrafico(estado: ResumoGraficoDashboard['estado']): string | undefined {
        if (estado === 'carregando') {
            return 'Carregando grafico financeiro...';
        }

        if (estado === 'vazio') {
            return 'Nenhum dado financeiro para montar o grafico neste periodo.';
        }

        if (estado === 'erro') {
            return 'Nao foi possivel carregar os dados do grafico.';
        }

        return undefined;
    }

    private somarValores(valores: number[]): number {
        return this.arredondarMoeda(valores.reduce((soma, valor) => soma + (Number.isFinite(valor) ? valor : 0), 0));
    }

    private arredondarMoeda(valor: number): number {
        return Math.round((valor + Number.EPSILON) * 100) / 100;
    }

    formatarMoeda(valor: number): string {
        return valor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
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
