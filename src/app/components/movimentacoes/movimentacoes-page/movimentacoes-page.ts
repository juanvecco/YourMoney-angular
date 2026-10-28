import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ContaFinanceira } from '../../../models/despesa.model';
import { FinancialViewState } from '../../../models/financial-view-state.model';
import {
  ConsultaMovimentacoesResponse,
  ResumoFinanceiroPeriodo,
  TipoMovimentacao,
} from '../../../models/movimentacao.model';
import { ContaFinanceiraService } from '../../../services/conta';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';
import { MovimentacaoService } from '../../../services/movimentacao';
import { MonthPickerComponent } from '../../shared/month-picker/month-picker';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ViewStateComponent } from '../../shared/view-state/view-state';
import { FinancialValuePipe } from '../../../pipes/financial-value.pipe';

@Component({
  selector: 'app-movimentacoes-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FinancialValuePipe, RouterLink, MonthPickerComponent, PageHeaderComponent, ViewStateComponent],
  templateUrl: './movimentacoes-page.html',
  styleUrl: './movimentacoes-page.scss',
})
export class MovimentacoesPageComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private loadRevision = 0;

  periodo = new Date();
  contas: ContaFinanceira[] = [];
  resposta: ConsultaMovimentacoesResponse = this.respostaVazia();
  estado: FinancialViewState = 'loading';
  mensagemEstado = 'Carregando movimentações...';
  filtroTipo: TipoMovimentacao | '' = '';
  filtroConta = '';
  busca = '';

  constructor(
    private readonly movimentacoes: MovimentacaoService,
    private readonly contasService: ContaFinanceiraService,
    private readonly context: FinancialNavigationContextService,
  ) {}

  ngOnInit(): void {
    this.periodo = this.context.period().date;
    this.contasService.listarContas().pipe(takeUntil(this.destroy$)).subscribe({
      next: contas => this.contas = contas,
      error: () => this.contas = [],
    });
    this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selecionarPeriodo(periodo: Date): void {
    this.context.setPeriod(periodo);
    this.periodo = this.context.period().date;
    this.resposta.pagina = 1;
    this.carregar(1);
  }

  aplicarFiltros(): void {
    this.carregar(1);
  }

  limparFiltros(): void {
    this.filtroTipo = '';
    this.filtroConta = '';
    this.busca = '';
    this.carregar(1);
  }

  irParaPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.resposta.totalPaginas || pagina === this.resposta.pagina) return;
    this.carregar(pagina);
  }

  carregar(pagina = this.resposta.pagina || 1): void {
    const revision = ++this.loadRevision;
    this.estado = this.resposta.totalItens ? 'refreshing' : 'loading';
    this.mensagemEstado = this.estado === 'refreshing'
      ? 'Atualizando movimentações...'
      : 'Carregando movimentações...';

    const mes = this.formatarMes(this.periodo);
    this.movimentacoes.consultar({
      mesInicial: mes,
      mesFinal: mes,
      tipo: this.filtroTipo,
      contaFinanceiraId: this.filtroConta || undefined,
      busca: this.busca,
      pagina,
      tamanhoPagina: 25,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: resposta => {
        if (revision !== this.loadRevision) return;
        this.resposta = resposta;
        this.estado = resposta.totalItens ? 'loadedWithData' : (this.temFiltro ? 'emptyFilter' : 'emptyPeriod');
        this.mensagemEstado = this.estado === 'emptyFilter'
          ? 'Nenhuma movimentação corresponde aos filtros. Ajuste ou limpe a busca.'
          : 'Ainda não há movimentações neste mês.';
      },
      error: () => {
        if (revision !== this.loadRevision) return;
        this.resposta = this.respostaVazia();
        this.estado = 'loadError';
        this.mensagemEstado = 'Não foi possível carregar as movimentações. Tente novamente.';
      },
    });
  }

  get totais(): ResumoFinanceiroPeriodo {
    return this.resposta.totais;
  }

  get temFiltro(): boolean {
    return !!(this.filtroTipo || this.filtroConta || this.busca.trim());
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  rotuloTipo(tipo: TipoMovimentacao): string {
    return { receita: 'Receita', despesa: 'Despesa', investimento: 'Investimento' }[tipo];
  }

  private formatarMes(data: Date): string {
    return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
  }

  private respostaVazia(): ConsultaMovimentacoesResponse {
    return {
      itens: [], pagina: 1, tamanhoPagina: 25, totalItens: 0, totalPaginas: 0,
      totais: { receitas: 0, despesas: 0, investimentos: 0, saldo: 0 },
    };
  }
}
