import { AfterViewInit, Component, effect, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';
import { ReceitaService } from '../../../services/receita';
import { Receita } from '../../../models/receita.model';
import { DespesaService, Despesa, Categoria } from '../../../services/despesa';
import { InvestimentoService, Investimento } from '../../../services/investimento';
import { ItemGraficoFinanceiro, ResumoGraficoDashboard } from '../../../models/dashboard-grafico.model';
import { MonthPickerComponent } from '../../shared/month-picker/month-picker';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ThemeService } from '../../../services/theme.service';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';
import { MovimentacaoService } from '../../../services/movimentacao';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';
import { ViewStateComponent } from '../../shared/view-state/view-state';
import { FinancialValuePipe } from '../../../pipes/financial-value.pipe';
import { FinancialVisibilityService } from '../../../services/financial-visibility.service';
import { ResumoFinanceiroMensal } from '../../../models/movimentacao.model';

interface HistoricoFinanceiroItem extends ResumoFinanceiroMensal {
    rotulo: string;
}

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [CommonModule, DecimalPipe, FinancialValuePipe, MonthPickerComponent, PageHeaderComponent, ViewStateComponent],
    templateUrl: './dashboard-page.html',
    styleUrls: ['./dashboard-page.css']
})
export class DashboardPageComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('graficoFinanceiroCanvas') graficoFinanceiroCanvas?: ElementRef<HTMLCanvasElement>;
    @ViewChild('graficoHistoricoCanvas') graficoHistoricoCanvas?: ElementRef<HTMLCanvasElement>;

    receitas: Receita[] = [];
    despesas: Despesa[] = [];
    investimentos: Investimento[] = [];
    categorias: Categoria[] = [];
    despesasPorTipo: { descricao: string; valor: number }[] = [];
    despesasPorNatureza: { descricao: string; valor: number }[] = [];
    resumoGrafico: ResumoGraficoDashboard = this.criarResumoGrafico([], [], [], new Date(), 'carregando');
    historicoFinanceiro: HistoricoFinanceiroItem[] = [];
    estadoHistorico: FinancialViewState = 'loading';
    mensagemHistorico = '';

    private graficoFinanceiro?: Chart;
    private graficoHistorico?: Chart;
    private viewInicializada = false;
    private loadRevision = 0;
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
    estadoResumo: FinancialViewState = 'loading';
    mensagemResumo = '';

    mesAtual = new Date();

    selecionarMes(periodo: Date): void {
        this.financialContext.setPeriod(periodo);
        this.mesAtual = this.financialContext.period().date;
        this.carregarDadosMesAtual();
    }

    constructor(
        private router: Router,
        private receitaService: ReceitaService,
        private despesaService: DespesaService,
        private investimentoService: InvestimentoService,
        private themeService: ThemeService,
        private financialContext: FinancialNavigationContextService,
        private movimentacaoService: MovimentacaoService,
        private readonly financialVisibility: FinancialVisibilityService
    ) {
        this.mesAtual = this.financialContext.period().date;
        effect(() => {
            this.themeService.theme();
            this.financialVisibility.valuesHidden();
            if (this.viewInicializada) queueMicrotask(() => {
                this.atualizarGraficoFinanceiro();
                this.atualizarGraficoHistorico();
            });
        });
    }

    ngOnInit(): void {
        this.carregarDadosMesAtual();
    }

    ngAfterViewInit(): void {
        this.viewInicializada = true;
        this.atualizarGraficoFinanceiro();
        this.atualizarGraficoHistorico();
    }

    ngOnDestroy(): void {
        this.destruirGraficoFinanceiro();
        this.destruirGraficoHistorico();
    }

    carregarDadosMesAtual() {
        const revision = ++this.loadRevision;
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.receitas = [];
        this.despesas = [];
        this.investimentos = [];
        this.despesasPorTipo = [];
        this.despesasPorNatureza = [];
        this.estadoResumo = 'loading';
        this.mensagemResumo = financialStateMessage('loading', this.mesAtual, 'o resumo financeiro');
        this.historicoFinanceiro = [];
        this.estadoHistorico = 'loading';
        this.mensagemHistorico = '';
        this.atualizarResumo();
        this.statusCarregamentoGrafico = {
            receitas: 'carregando',
            despesas: 'carregando',
            investimentos: 'carregando'
        };
        this.resumoGrafico = this.criarResumoGrafico([], [], [], this.mesAtual, 'carregando');
        this.atualizarGraficoFinanceiro();
        this.atualizarGraficoHistorico();

        const referencia = ano + '-' + String(mes).padStart(2, '0');
        const inicioHistorico = new Date(ano, mes - 6, 1);
        const referenciaInicial = this.formatarReferenciaMes(inicioHistorico);
        this.movimentacaoService.consultar({
            mesInicial: referenciaInicial, mesFinal: referencia, pagina: 1, tamanhoPagina: 10
        }).subscribe({
            next: response => {
                if (revision !== this.loadRevision) return;
                const totaisPorMes = response.totaisPorMes ?? [];
                const totalMesAtual = totaisPorMes.find(item => item.mesReferencia === referencia);
                this.resumo = {
                    receitas: totalMesAtual?.receitas ?? 0,
                    despesas: totalMesAtual?.despesas ?? 0,
                    investimentos: totalMesAtual?.investimentos ?? 0,
                    sobrou: totalMesAtual?.saldo ?? 0
                };
                this.estadoResumo = totalMesAtual?.totalItens ? 'loadedWithData' : 'emptyPeriod';
                this.mensagemResumo = totalMesAtual?.totalItens
                    ? ''
                    : financialStateMessage('emptyPeriod', this.mesAtual, 'movimentações');
                this.historicoFinanceiro = this.criarHistoricoMensal(totaisPorMes, inicioHistorico, this.mesAtual);
                this.estadoHistorico = response.totalItens ? 'loadedWithData' : 'emptyPeriod';
                this.mensagemHistorico = response.totalItens
                    ? ''
                    : 'Ainda não há movimentações suficientes para montar o histórico.';
                this.atualizarGraficoHistorico();
            },
            error: () => {
                if (revision !== this.loadRevision) return;
                this.resumo = { receitas: 0, despesas: 0, investimentos: 0, sobrou: 0 };
                this.estadoResumo = 'loadError';
                this.mensagemResumo = financialStateMessage('loadError', this.mesAtual, 'o resumo financeiro');
                this.estadoHistorico = 'loadError';
                this.mensagemHistorico = 'Não foi possível carregar o histórico financeiro.';
            }
        });

        this.despesaService.listarCategorias().subscribe({
            next: (categorias) => {
                if (revision !== this.loadRevision) return;
                this.categorias = categorias;
                this.atualizarAgrupamentosDespesa();
            },
            error: (erro) => {
                if (revision !== this.loadRevision) return;
                console.error('Erro ao carregar categorias:', erro);
            }
        });

        this.receitaService.obterPorReferencia(mes, ano).subscribe({
            next: (receitas) => {
                if (revision !== this.loadRevision) return;
                this.receitas = receitas;
                this.statusCarregamentoGrafico.receitas = 'pronto';
                this.atualizarResumo();
                this.atualizarResumoGrafico();
            },
            error: (erro) => {
                if (revision !== this.loadRevision) return;
                console.error('Erro ao carregar receitas:', erro);
                this.receitas = [];
                this.statusCarregamentoGrafico.receitas = 'erro';
                this.atualizarResumo();
                this.atualizarResumoGrafico();
            }
        });

        this.despesaService.obterPorReferencia(mes, ano).subscribe({
            next: (despesas) => {
                if (revision !== this.loadRevision) return;
                this.despesas = despesas;
                this.statusCarregamentoGrafico.despesas = 'pronto';
                this.atualizarResumo();
                this.atualizarAgrupamentosDespesa();
                this.atualizarResumoGrafico();
            },
            error: (erro) => {
                if (revision !== this.loadRevision) return;
                console.error('Erro ao carregar despesas:', erro);
                this.despesas = [];
                this.despesasPorTipo = [];
                this.despesasPorNatureza = [];
                this.statusCarregamentoGrafico.despesas = 'erro';
                this.atualizarResumo();
                this.atualizarResumoGrafico();
            }
        });

        this.investimentoService.obterPorReferencia(mes, ano).subscribe({
            next: (investimentos) => {
                if (revision !== this.loadRevision) return;
                this.investimentos = investimentos;
                this.statusCarregamentoGrafico.investimentos = 'pronto';
                this.atualizarResumo();
                this.atualizarResumoGrafico();
            },
            error: (erro) => {
                if (revision !== this.loadRevision) return;
                console.error('Erro ao carregar investimentos:', erro);
                this.investimentos = [];
                this.statusCarregamentoGrafico.investimentos = 'erro';
                this.atualizarResumo();
                this.atualizarResumoGrafico();
            }
        });
    }

    atualizarResumo() {
        if (this.estadoResumo !== 'loading') return;
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
            { id: 'investimentos', rotulo: 'Investimentos', tipo: 'investimento', valor: totalInvestimentos, cor: '#5d5fef' }
        ];

        if (saldo < 0) {
            itensBase.push({ id: 'saldo', rotulo: 'Saldo negativo', tipo: 'saldo', valor: Math.abs(saldo), cor: '#b45309' });
        }

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
                        backgroundColor: this.resumoGrafico.items.map(item => this.corSemanticaGrafico(item.tipo)),
                        borderColor: this.tokenCss('--ym-chart-border', '#ffffff'),
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
                        backgroundColor: this.tokenCss('--ym-chart-tooltip', '#0f172a'),
                        titleColor: this.tokenCss('--ym-inverse', '#ffffff'),
                        bodyColor: this.tokenCss('--ym-inverse', '#ffffff'),
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

    private corSemanticaGrafico(tipo: ItemGraficoFinanceiro['tipo']): string {
        const tokens: Record<ItemGraficoFinanceiro['tipo'], string> = {
            receita: '--ym-success', despesa: '--ym-danger', investimento: '--ym-investment', saldo: '--ym-primary'
        };
        return this.tokenCss(tokens[tipo], '#64748b');
    }

    private tokenCss(name: string, fallback: string): string {
        if (typeof getComputedStyle !== 'function') return fallback;
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    }

    private destruirGraficoFinanceiro(): void {
        this.graficoFinanceiro?.destroy();
        this.graficoFinanceiro = undefined;
    }

    private criarHistoricoMensal(
        totais: ResumoFinanceiroMensal[],
        inicio: Date,
        fim: Date
    ): HistoricoFinanceiroItem[] {
        const porReferencia = new Map(totais.map(item => [item.mesReferencia, item]));
        const historico: HistoricoFinanceiroItem[] = [];
        const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
        const ultimoMes = new Date(fim.getFullYear(), fim.getMonth(), 1);

        while (cursor <= ultimoMes) {
            const mesReferencia = this.formatarReferenciaMes(cursor);
            const total = porReferencia.get(mesReferencia);
            historico.push({
                mesReferencia,
                totalItens: total?.totalItens ?? 0,
                receitas: total?.receitas ?? 0,
                despesas: total?.despesas ?? 0,
                investimentos: total?.investimentos ?? 0,
                saldo: total?.saldo ?? 0,
                rotulo: cursor.toLocaleDateString('pt-BR', { month: 'short' })
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }

        return historico;
    }

    private formatarReferenciaMes(data: Date): string {
        return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    }

    private atualizarGraficoHistorico(): void {
        if (!this.viewInicializada || !this.graficoHistoricoCanvas) return;
        if (this.estadoHistorico !== 'loadedWithData' || this.historicoFinanceiro.length === 0) {
            this.destruirGraficoHistorico();
            return;
        }

        const configuracao = this.criarConfiguracaoGraficoHistorico();
        if (!this.graficoHistorico) {
            this.graficoHistorico = new Chart(this.graficoHistoricoCanvas.nativeElement, configuracao);
            return;
        }

        this.graficoHistorico.data = configuracao.data;
        this.graficoHistorico.options = configuracao.options ?? {};
        this.graficoHistorico.update();
    }

    private criarConfiguracaoGraficoHistorico(): ChartConfiguration<'bar', number[], string> {
        const valuesVisible = !this.financialVisibility.valuesHidden();
        const months = this.historicoFinanceiro;
        const dados = (selector: (item: HistoricoFinanceiroItem) => number) =>
            months.map(item => valuesVisible ? selector(item) : 0);
        const formatter = new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1
        });

        return {
            type: 'bar',
            data: {
                labels: months.map(item => item.rotulo),
                datasets: [
                    { label: 'Receitas', data: dados(item => item.receitas), backgroundColor: this.tokenCss('--ym-success', '#16794c'), borderRadius: 5, maxBarThickness: 28 },
                    { label: 'Despesas', data: dados(item => item.despesas), backgroundColor: this.tokenCss('--ym-danger', '#c2413a'), borderRadius: 5, maxBarThickness: 28 },
                    { label: 'Investimentos', data: dados(item => item.investimentos), backgroundColor: this.tokenCss('--ym-investment', '#5d5fef'), borderRadius: 5, maxBarThickness: 28 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: this.tokenCss('--ym-text', '#1f2937'), usePointStyle: true, padding: 18 }
                    },
                    tooltip: {
                        backgroundColor: this.tokenCss('--ym-chart-tooltip', '#0f172a'),
                        titleColor: this.tokenCss('--ym-inverse', '#ffffff'),
                        bodyColor: this.tokenCss('--ym-inverse', '#ffffff'),
                        callbacks: {
                            label: context => `${context.dataset.label}: ${this.formatarMoeda(Number(context.parsed.y))}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: this.tokenCss('--ym-muted', '#64748b') }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: this.tokenCss('--ym-border', 'rgba(100,116,139,.18)') },
                        ticks: {
                            color: this.tokenCss('--ym-muted', '#64748b'),
                            callback: value => this.financialVisibility.valuesHidden() ? '....' : formatter.format(Number(value))
                        }
                    }
                }
            }
        };
    }

    private destruirGraficoHistorico(): void {
        this.graficoHistorico?.destroy();
        this.graficoHistorico = undefined;
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
        return this.financialVisibility.valuesHidden() ? '....' : this.financialVisibility.formatCurrency(valor);
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
        this.financialContext.setPeriod(data);
        this.carregarDadosMesAtual();
    }

    proximoMes(): void {
        const data = new Date(this.mesAtual);
        data.setMonth(data.getMonth() + 1);
        this.mesAtual = data;
        this.financialContext.setPeriod(data);
        this.carregarDadosMesAtual();
    }
}
