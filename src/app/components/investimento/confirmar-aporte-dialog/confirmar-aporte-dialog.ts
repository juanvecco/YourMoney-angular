import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MetaMensal } from '../../../models/meta-mensal.model';
import { Investimento } from '../../../models/investimento.model';
import { AporteObjetivoService } from '../../../services/aporte-objetivo';
import { FinancialValuePipe } from '../../../pipes/financial-value.pipe';
import { FinancialValueInputDirective } from '../../../directives/financial-value-input.directive';

@Component({ selector: 'app-confirmar-aporte-dialog', standalone: true, imports: [CommonModule, FormsModule, FinancialValuePipe, FinancialValueInputDirective],
  templateUrl: './confirmar-aporte-dialog.html', styleUrls: ['./confirmar-aporte-dialog.scss'] })
export class ConfirmarAporteDialogComponent {
  @Input() investimentos: Investimento[] = [];
  @Output() readonly confirmado = new EventEmitter<void>();
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;
  meta: MetaMensal | null = null;
  valor = 0; dataConfirmacao = new Date().toISOString().slice(0, 10); investimentoId = '';
  salvando = false; erro = '';
  constructor(private readonly service: AporteObjetivoService) {}
  abrir(meta: MetaMensal): void { this.meta = meta; this.valor = meta.valorRestante || meta.valorCalculado; this.investimentoId = ''; this.erro = ''; this.dialog?.nativeElement.showModal(); }
  fechar(): void { this.dialog?.nativeElement.close(); }
  get destinos(): Investimento[] { return this.investimentos.filter(i => i.ativo && i.grupoObjetivoId === this.meta?.grupoObjetivoInvestimentoId); }
  salvar(): void {
    if (!this.meta || this.salvando || this.valor <= 0) return;
    this.salvando = true;
    this.service.confirmar(this.meta.id, { valor: this.valor, dataConfirmacao: this.dataConfirmacao,
      investimentoId: this.investimentoId || null, operacaoId: crypto.randomUUID() })
      .pipe(finalize(() => this.salvando = false)).subscribe({ next: () => { this.fechar(); this.confirmado.emit(); },
        error: e => this.erro = e?.error?.message ?? 'Não foi possível confirmar o aporte.' });
  }
}
