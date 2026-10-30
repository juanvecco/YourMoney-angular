import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AcaoVinculosGrupoObjetivo, GrupoObjetivoInvestimento } from '../../../models/investimento-grupo.model';
import { IMAGEM_OBJETIVO_CARRO, imagemSugeridaObjetivo, resolverImagemObjetivo } from '../../../models/objetivo-imagem';
import { FeedbackService } from '../../../services/feedback.service';
import { InvestimentoGrupoService } from '../../../services/investimento-grupo';
import { FinancialValuePipe } from '../../../pipes/financial-value.pipe';
import { FinancialValueInputDirective } from '../../../directives/financial-value-input.directive';

@Component({
  selector: 'app-grupo-objetivo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FinancialValuePipe, FinancialValueInputDirective],
  templateUrl: './grupo-objetivo-dialog.html',
  styleUrls: ['./grupo-objetivo-dialog.scss'],
})
export class GrupoObjetivoDialogComponent {
  @Input() grupos: GrupoObjetivoInvestimento[] = [];
  @Output() readonly alterado = new EventEmitter<void>();
  @ViewChild('nomeInput') nomeInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;

  nome = '';
  descricao = '';
  imagemUrl: string | null = null;
  valorAlvo: number | null = null;
  dataAlvo = '';
  grupoPaiId: string | null = null;
  editando: GrupoObjetivoInvestimento | null = null;
  excluindo: GrupoObjetivoInvestimento | null = null;
  acaoExclusao: AcaoVinculosGrupoObjetivo = 'Desassociar';
  grupoDestinoId = '';
  salvando = false;
  enviandoImagem = false;
  mensagemImagem = '';
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
    this.descricao = grupo.descricao ?? '';
    this.imagemUrl = grupo.imagemUrl ?? null;
    this.valorAlvo = grupo.valorAlvo ?? null;
    this.dataAlvo = grupo.dataAlvo?.slice(0, 10) ?? '';
    this.grupoPaiId = grupo.grupoPaiId ?? null;
    queueMicrotask(() => this.nomeInput?.nativeElement.focus());
  }

  cancelarEdicao(): void {
    this.nome = '';
    this.descricao = '';
    this.imagemUrl = null;
    this.valorAlvo = null;
    this.dataAlvo = '';
    this.grupoPaiId = null;
    this.editando = null;
    this.excluindo = null;
    this.acaoExclusao = 'Desassociar';
    this.grupoDestinoId = '';
    this.mensagemImagem = '';
  }

  salvar(): void {
    const nome = this.nome.trim();
    if (this.salvando || this.enviandoImagem || !nome || nome.length > 100 || this.descricao.trim().length > 160) return;
    this.salvando = true;
    const apresentacao = {
      descricao: this.descricao.trim() || null,
      imagemUrl: this.imagemUrl,
    };
    const request$ = this.editando
      ? this.service.renomear(this.editando.id, { nome, ...apresentacao, versao: this.editando.versao, valorAlvo: this.valorAlvo, dataAlvo: this.dataAlvo || null, grupoPaiId: this.grupoPaiId })
      : this.service.criar({ nome, ...apresentacao, valorAlvo: this.valorAlvo, dataAlvo: this.dataAlvo || null, grupoPaiId: this.grupoPaiId });
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

  aplicarSugestaoCarro(): void {
    this.nome = 'Carro / Família';
    this.descricao = 'City LX Sedan';
    this.valorAlvo = 117700;
    this.imagemUrl = IMAGEM_OBJETIVO_CARRO;
    this.grupoPaiId = this.grupos.find(grupo => grupo.nome.toLocaleLowerCase('pt-BR') === 'longo prazo' && grupo.ativo !== false)?.id ?? null;
    this.mensagemImagem = '';
  }

  objetivosPrincipaisDisponiveis(): GrupoObjetivoInvestimento[] {
    return this.grupos.filter(grupo =>
      grupo.id !== this.editando?.id &&
      grupo.ativo !== false &&
      !grupo.grupoPaiId
    );
  }

  nomeGrupoPai(grupo: GrupoObjetivoInvestimento): string | null {
    return this.grupos.find(item => item.id === grupo.grupoPaiId)?.nome ?? null;
  }

  selecionarImagem(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    input.value = '';
    if (!arquivo) return;

    const formatos = ['image/png', 'image/jpeg', 'image/webp'];
    if (!formatos.includes(arquivo.type)) {
      this.mensagemImagem = 'Use uma imagem PNG, JPEG ou WebP.';
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      this.mensagemImagem = 'A imagem deve ter no máximo 5 MB.';
      return;
    }

    this.enviandoImagem = true;
    this.mensagemImagem = '';
    this.service.enviarImagem(arquivo).pipe(finalize(() => this.enviandoImagem = false)).subscribe({
      next: resposta => this.imagemUrl = resposta.imagemUrl,
      error: error => this.mensagemImagem = error?.error?.message ?? 'Não foi possível enviar a imagem.',
    });
  }

  removerImagem(): void {
    this.imagemUrl = null;
    this.mensagemImagem = '';
  }

  imagemPreview(): string | null {
    return resolverImagemObjetivo(this.imagemUrl);
  }

  imagemDoGrupo(grupo: GrupoObjetivoInvestimento): string | null {
    return resolverImagemObjetivo(grupo.imagemUrl) ?? imagemSugeridaObjetivo(grupo.nome, grupo.descricao);
  }

  alterarEstado(grupo: GrupoObjetivoInvestimento): void {
    if (this.salvando) return;
    this.salvando = true;
    const operacao = grupo.ativo === false ? this.service.reativar(grupo) : this.service.arquivar(grupo);
    operacao.pipe(finalize(() => this.salvando = false)).subscribe({
      next: async () => { this.alterado.emit(); this.fechar(); await this.feedback.success(grupo.ativo === false ? 'Objetivo reativado' : 'Objetivo arquivado'); },
      error: error => void this.exibirErro('Não foi possível alterar o objetivo', error)
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
    return this.grupos.filter(item => item.id !== grupo.id && item.ativo !== false);
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
