import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';
import { ResumoFinanceiroPeriodo } from '../../../models/movimentacao.model';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';
import { MovimentacaoService } from '../../../services/movimentacao';
import { MonthPickerComponent } from '../../shared/month-picker/month-picker';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ViewStateComponent } from '../../shared/view-state/view-state';
import { FinancialValuePipe } from '../../../pipes/financial-value.pipe';

@Component({
  selector: 'app-disponivel-page',
  standalone: true,
  imports: [CommonModule, FinancialValuePipe, RouterLink, MonthPickerComponent, PageHeaderComponent, ViewStateComponent],
  templateUrl: './disponivel-page.html',
  styleUrl: './disponivel-page.css',
})
export class DisponivelPageComponent implements OnInit {
  private loadRevision = 0;
  mesAtual = new Date();
  estadoDaPagina: FinancialViewState = 'loading';
  mensagemCarregamento = '';
  resumo: ResumoFinanceiroPeriodo = { receitas: 0, despesas: 0, investimentos: 0, saldo: 0 };

  constructor(
    private readonly movimentacoes: MovimentacaoService,
    private readonly context: FinancialNavigationContextService,
  ) {}

  ngOnInit(): void {
    this.mesAtual = this.context.period().date;
    this.carregarDados();
  }

  selecionarMes(periodo: Date): void {
    this.context.setPeriod(periodo);
    this.mesAtual = this.context.period().date;
    this.carregarDados();
  }

  carregarDados(): void {
    const revision = ++this.loadRevision;
    this.estadoDaPagina = 'loading';
    this.resumo = { receitas: 0, despesas: 0, investimentos: 0, saldo: 0 };
    this.mensagemCarregamento = financialStateMessage('loading', this.mesAtual, 'o saldo disponível');
    const mes = this.mesAtual.getFullYear() + '-' + String(this.mesAtual.getMonth() + 1).padStart(2, '0');
    this.movimentacoes.consultar({ mesInicial: mes, mesFinal: mes, pagina: 1, tamanhoPagina: 10 }).subscribe({
      next: response => {
        if (revision !== this.loadRevision) return;
        this.resumo = response.totais;
        this.estadoDaPagina = response.totalItens ? 'loadedWithData' : 'emptyPeriod';
        this.mensagemCarregamento = response.totalItens
          ? ''
          : financialStateMessage('emptyPeriod', this.mesAtual, 'receitas ou despesas');
      },
      error: () => {
        if (revision !== this.loadRevision) return;
        this.estadoDaPagina = 'loadError';
        this.mensagemCarregamento = financialStateMessage('loadError', this.mesAtual, 'o saldo disponível');
      },
    });
  }

  formatarValor(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
