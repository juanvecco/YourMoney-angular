import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcaoVinculosGrupoObjetivo, GrupoObjetivoInvestimento } from '../../../models/investimento-grupo.model';
import { FeedbackService } from '../../../services/feedback.service';
import { InvestimentoGrupoService } from '../../../services/investimento-grupo';

@Component({
  selector: 'app-grupo-objetivo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grupo-objetivo-dialog.html',
  styleUrls: ['./grupo-objetivo-dialog.scss'],
})
export class GrupoObjetivoDialogComponent {
  @Input() grupos: GrupoObjetivoInvestimento[] = [];
  @Output() readonly alterado = new EventEmitter<void>();
  @ViewChild('nomeInput') nomeInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;

  nome = '';
  editando: GrupoObjetivoInvestimento | null = null;
  excluindo: GrupoObjetivoInvestimento | null = null;
  acaoExclusao: AcaoVinculosGrupoObjetivo = 'Desassociar';
  grupoDestinoId = '';
  salvando = false;
  private retornoFoco: HTMLElement | null = null;

  constructor(private readonly service: InvestimentoGrupoService, private readonly feedback: FeedbackService) {}

  abrir(): void {
    this.retornoFoco = document.activeElement as HTMLElement | null;
    this.cancelarEdicao();
    this.dialog?.nativeElement.showModal();
    queueMicrotask(() => this.nomeInput?.nativeElement.focus());
  }

  fechar(): void {
    if (this.dialog?.nativeElement.open) this.dialog.nativeElement.close();
    this.retornoFoco?.focus();
  }

  editar(grupo: GrupoObjetivoInvestimento): void {
    this.editando = grupo;
    this.excluindo = null;
    this.nome = grupo.nome;
    queueMicrotask(() => this.nomeInput?.nativeElement.focus());
  }

  cancelarEdicao(): void {
    this.nome = '';
    this.editando = null;
    this.excluindo = null;
    this.acaoExclusao = 'Desassociar';
    this.grupoDestinoId = '';
  }

  salvar(): void {
    const nome = this.nome.trim();
    if (this.salvando || !nome || nome.length > 100) return;
    this.salvando = true;
    const request$ = this.editando
      ? this.service.renomear(this.editando.id, { nome, versao: this.editando.versao })
      : this.service.criar({ nome });
    request$.pipe(finalize(() => this.salvando = false)).subscribe({
      next: async () => {
        const titulo = this.editando ? 'Objetivo atualizado' : 'Objetivo criado';
        this.cancelarEdicao();
        this.alterado.emit();
        this.fechar();
        await this.feedback.success(titulo);
      },
      error: error => void this.exibirErro('Não foi possível salvar o objetivo', error),
    });
  }

  async prepararExclusao(grupo: GrupoObjetivoInvestimento): Promise<void> {
    if (this.salvando) return;
    if (grupo.quantidadeInvestimentos > 0) {
      this.excluindo = grupo;
      this.editando = null;
      this.acaoExclusao = this.outrosGrupos(grupo).length ? 'Transferir' : 'Desassociar';
      this.grupoDestinoId = this.outrosGrupos(grupo)[0]?.id ?? '';
      return;
    }
    const confirmado = await this.executarFeedback(() => this.feedback.confirm({
      kind: 'confirmation',
      title: 'Excluir objetivo?',
      message: `“${grupo.nome}” será excluído.`,
      destructive: true,
    }));
    if (confirmado) {
      this.executarExclusao(grupo, 'ExigirVazio');
    }
  }

  confirmarExclusao(): void {
    if (!this.excluindo || this.salvando) return;
    if (this.acaoExclusao === 'Transferir' && !this.grupoDestinoId) return;
    this.executarExclusao(this.excluindo, this.acaoExclusao);
  }

  outrosGrupos(grupo: GrupoObjetivoInvestimento): GrupoObjetivoInvestimento[] {
    return this.grupos.filter(item => item.id !== grupo.id);
  }

  private executarExclusao(grupo: GrupoObjetivoInvestimento, acao: AcaoVinculosGrupoObjetivo): void {
    const destino = acao === 'Transferir' ? this.grupos.find(item => item.id === this.grupoDestinoId) : undefined;
    this.salvando = true;
    this.service.excluir(grupo.id, {
      versaoOrigem: grupo.versao,
      acaoVinculos: acao,
      grupoDestinoId: destino?.id ?? null,
      versaoDestino: destino?.versao ?? null,
    }).pipe(finalize(() => this.salvando = false)).subscribe({
      next: async () => {
        this.cancelarEdicao();
        this.alterado.emit();
        this.fechar();
        await this.feedback.success('Objetivo excluído', 'Nenhum investimento foi excluído.');
      },
      error: error => void this.exibirErro('Não foi possível excluir o objetivo', error),
    });
  }

  private exibirErro(titulo: string, error: any): Promise<void> {
    return this.executarFeedback(() => this.feedback.error(titulo, this.mensagemErro(error)));
  }

  private async executarFeedback<T>(acao: () => Promise<T>): Promise<T> {
    const dialog = this.dialog?.nativeElement;
    const reabrir = !!dialog?.open;
    if (reabrir) dialog.close();
    try {
      return await acao();
    } finally {
      if (reabrir && dialog && !dialog.open) {
        dialog.showModal();
        queueMicrotask(() => this.nomeInput?.nativeElement.focus());
      }
    }
  }

  private mensagemErro(error: any): string {
    if (error?.status === 409) return error?.error?.message ?? 'Os dados mudaram. Atualize e tente novamente.';
    return error?.error?.message ?? 'Tente novamente em instantes.';
  }
}
