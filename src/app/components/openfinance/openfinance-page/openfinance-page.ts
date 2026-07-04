import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  OpenFinanceReadiness,
  OpenFinanceSource,
  OpenFinanceSuggestedFinancialType,
  OpenFinanceTransactionPreview
} from '../../../models/openfinance.model';
import { OpenFinanceService } from '../../../services/openfinance';

type ViewState = 'loading' | 'loaded' | 'empty' | 'error';

@Component({
  selector: 'app-openfinance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './openfinance-page.html',
  styleUrls: ['./openfinance-page.css']
})
export class OpenFinancePageComponent implements OnInit {
  fontes: OpenFinanceSource[] = [];
  readiness: OpenFinanceReadiness | null = null;
  transacoes: OpenFinanceTransactionPreview[] = [];
  estadoFontes: ViewState = 'loading';
  estadoPreview: ViewState = 'loading';
  mensagemErroFontes = '';
  mensagemErroPreview = '';
  fonteSelecionada = 'mock-transactions';
  private ultimoReadiness: OpenFinanceReadiness | null = null;
  private ultimasFontes: OpenFinanceSource[] = [];

  constructor(private openFinanceService: OpenFinanceService) { }

  ngOnInit(): void {
    this.carregarFontes();
    this.carregarPreview();
  }

  carregarFontes(): void {
    this.estadoFontes = 'loading';
    this.mensagemErroFontes = '';

    this.openFinanceService.obterFontes().subscribe({
      next: (response) => {
        this.readiness = response.readiness;
        this.fontes = response.sources;
        this.ultimoReadiness = response.readiness;
        this.ultimasFontes = response.sources;
        this.estadoFontes = response.sources.length > 0 ? 'loaded' : 'empty';
      },
      error: () => {
        this.readiness = this.ultimoReadiness;
        this.fontes = this.ultimasFontes;
        this.estadoFontes = this.fontes.length > 0 ? 'loaded' : 'error';
        this.mensagemErroFontes = 'Nao foi possivel atualizar as fontes OpenFinance.';
      }
    });
  }

  carregarPreview(sourceId = this.fonteSelecionada): void {
    this.estadoPreview = 'loading';
    this.mensagemErroPreview = '';

    this.openFinanceService.obterPreviewTransacoes(sourceId).subscribe({
      next: (response) => {
        this.transacoes = response.items.map(item => ({ ...item }));
        this.estadoPreview = response.items.length > 0 ? 'loaded' : 'empty';
      },
      error: () => {
        this.transacoes = [];
        this.estadoPreview = 'error';
        this.mensagemErroPreview = 'Nao foi possivel carregar o preview de transacoes.';
      }
    });
  }

  atualizarClassificacaoLocal(
    transacao: OpenFinanceTransactionPreview,
    suggestedFinancialType: OpenFinanceSuggestedFinancialType
  ): void {
    transacao.suggestedFinancialType = suggestedFinancialType;
  }

  fonteSuportaPreview(fonte: OpenFinanceSource): boolean {
    return fonte.supportsTransactionPreview && fonte.status === 'available';
  }

  obterRotuloTipoFonte(tipo: OpenFinanceSource['type']): string {
    const rotulos: Record<OpenFinanceSource['type'], string> = {
      public: 'Publica',
      simulated: 'Simulada',
      'future-consent': 'Consentimento futuro'
    };
    return rotulos[tipo];
  }

  obterRotuloStatus(status: OpenFinanceSource['status']): string {
    const rotulos: Record<OpenFinanceSource['status'], string> = {
      available: 'Disponivel',
      unavailable: 'Indisponivel',
      checking: 'Verificando',
      failed: 'Falhou',
      'not-configured': 'Nao configurada'
    };
    return rotulos[status];
  }

  obterRotuloDirecao(direction: OpenFinanceTransactionPreview['direction']): string {
    return direction === 'inflow' ? 'Entrada' : 'Saida';
  }

  obterRotuloClassificacao(tipo: OpenFinanceSuggestedFinancialType): string {
    const rotulos: Record<OpenFinanceSuggestedFinancialType, string> = {
      receita: 'Receita',
      despesa: 'Despesa',
      unknown: 'A revisar'
    };
    return rotulos[tipo];
  }

  formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
