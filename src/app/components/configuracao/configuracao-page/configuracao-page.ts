import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Categoria, ContaFinanceira } from '../../../models/despesa.model';
import { CategoriaPayload, CategoriaService } from '../../../services/categoria';
import { ContaFinanceiraService } from '../../../services/conta';
import { FeedbackService } from '../../../services/feedback.service';
import { CriarCategoriaComponent } from '../../categoria/criar-categoria/criar-categoria';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ViewStateComponent } from '../../shared/view-state/view-state';

type SecaoConfiguracao = 'categorias' | 'contas' | 'conexoes';

@Component({
  selector: 'app-configuracao-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CriarCategoriaComponent, PageHeaderComponent, ViewStateComponent],
  templateUrl: './configuracao-page.html',
  styleUrl: './configuracao-page.css',
})
export class ConfiguracaoPageComponent implements OnInit {
  private readonly tipoTransacaoDespesa = 1;
  private categoriaRevision = 0;
  private contaRevision = 0;

  secao: SecaoConfiguracao = 'categorias';
  categorias: Categoria[] = [];
  categoriasEspecificas: Categoria[] = [];
  contas: ContaFinanceira[] = [];
  instituicoesBancarias: string[] = [];
  mostrarModalCategoria = false;
  categoriaEmEdicao: Categoria | null = null;
  carregandoCategorias = false;
  carregandoContas = false;
  salvandoCategoria = false;
  salvandoConta = false;
  mensagemErro = '';
  mensagemSucesso = '';
  contaDescricao = '';
  contaEditando: ContaFinanceira | null = null;

  constructor(
    private readonly categoriaService: CategoriaService,
    private readonly contaService: ContaFinanceiraService,
    private readonly feedback: FeedbackService,
  ) {}

  ngOnInit(): void {
    this.carregarCategorias();
    this.carregarContas();
    this.carregarInstituicoesBancarias();
  }

  selecionarSecao(secao: SecaoConfiguracao): void {
    this.secao = secao;
    this.limparMensagens();
  }

  carregarCategorias(): void {
    const revision = ++this.categoriaRevision;
    this.carregandoCategorias = true;
    this.mensagemErro = '';
    this.categoriaService.listarCategorias().subscribe({
      next: categorias => {
        if (revision !== this.categoriaRevision) return;
        this.categorias = categorias;
        this.categoriasEspecificas = this.obterCategoriasEspecificas(categorias);
        this.carregandoCategorias = false;
      },
      error: () => {
        if (revision !== this.categoriaRevision) return;
        this.mensagemErro = 'Não foi possível carregar as categorias.';
        this.carregandoCategorias = false;
      },
    });
  }

  carregarContas(): void {
    const revision = ++this.contaRevision;
    this.carregandoContas = true;
    this.contaService.listarContas().subscribe({
      next: contas => {
        if (revision !== this.contaRevision) return;
        this.contas = contas;
        this.carregandoContas = false;
      },
      error: () => {
        if (revision !== this.contaRevision) return;
        this.mensagemErro = 'Não foi possível carregar as contas.';
        this.carregandoContas = false;
      },
    });
  }

  carregarInstituicoesBancarias(): void {
    // Mantém compatibilidade com stubs e integrações antigas que ainda não oferecem o catálogo.
    if (typeof this.contaService.listarInstituicoesBancarias !== 'function') return;
    this.contaService.listarInstituicoesBancarias().subscribe({
      next: instituicoes => this.instituicoesBancarias = instituicoes,
      error: () => this.instituicoesBancarias = [],
    });
  }

  abrirModalCategoria(): void {
    if (this.salvandoCategoria) return;
    this.categoriaEmEdicao = null;
    this.mostrarModalCategoria = true;
  }

  editarCategoria(categoria: Categoria): void {
    this.categoriaEmEdicao = { ...categoria };
    this.mostrarModalCategoria = true;
  }

  fecharModalCategoria(): void {
    if (this.salvandoCategoria) return;
    this.mostrarModalCategoria = false;
    this.categoriaEmEdicao = null;
  }

  salvarCategoria(evento: { id?: string; payload: CategoriaPayload }): void {
    if (this.salvandoCategoria) return;
    this.limparMensagens();
    this.salvandoCategoria = true;
    const requisicao = evento.id
      ? this.categoriaService.atualizarCategoria(evento.id, evento.payload)
      : this.categoriaService.criarCategoria(evento.payload);
    requisicao.subscribe({
      next: () => {
        this.salvandoCategoria = false;
        this.mensagemSucesso = evento.id ? 'Categoria atualizada.' : 'Categoria cadastrada.';
        this.mostrarModalCategoria = false;
        this.categoriaEmEdicao = null;
        this.carregarCategorias();
      },
      error: () => {
        this.salvandoCategoria = false;
        this.mensagemErro = 'Não foi possível salvar a categoria.';
      },
    });
  }

  async removerCategoria(categoria: Categoria): Promise<void> {
    const confirmar = await this.feedback.confirm({
      kind: 'confirmation', title: 'Remover categoria?',
      message: 'A categoria “' + categoria.descricao + '” deixará de aparecer nas seleções.',
      confirmLabel: 'Remover categoria', destructive: true,
    });
    if (!confirmar) return;
    this.limparMensagens();
    this.categoriaService.removerCategoria(categoria.id).subscribe({
      next: () => { this.mensagemSucesso = 'Categoria removida.'; this.carregarCategorias(); },
      error: () => this.mensagemErro = 'Não foi possível remover a categoria.',
    });
  }

  editarConta(conta: ContaFinanceira): void {
    this.contaEditando = conta;
    this.contaDescricao = conta.descricao;
  }

  cancelarConta(): void {
    this.contaEditando = null;
    this.contaDescricao = '';
  }

  salvarConta(): void {
    const descricao = this.contaDescricao.trim();
    if (!descricao || this.salvandoConta) return;
    this.limparMensagens();
    this.salvandoConta = true;
    const requisicao = this.contaEditando
      ? this.contaService.atualizarConta(this.contaEditando.id, { descricao })
      : this.contaService.criarConta({ descricao });
    requisicao.subscribe({
      next: () => {
        this.mensagemSucesso = this.contaEditando ? 'Conta atualizada.' : 'Conta criada.';
        this.salvandoConta = false;
        this.cancelarConta();
        this.carregarContas();
      },
      error: () => {
        this.salvandoConta = false;
        this.mensagemErro = 'Não foi possível salvar a conta.';
      },
    });
  }

  async removerConta(conta: ContaFinanceira): Promise<void> {
    const confirmar = await this.feedback.confirm({
      kind: 'confirmation', title: 'Remover conta?',
      message: 'A conta “' + conta.descricao + '” será removida se não possuir movimentações vinculadas.',
      confirmLabel: 'Remover conta', destructive: true,
    });
    if (!confirmar) return;
    this.limparMensagens();
    this.contaService.removerConta(conta.id).subscribe({
      next: () => { this.mensagemSucesso = 'Conta removida.'; this.carregarContas(); },
      error: (error: HttpErrorResponse) => {
        this.mensagemErro = error.status === 409
          ? 'Esta conta está em uso. Mova ou preserve os lançamentos vinculados antes de removê-la.'
          : 'Não foi possível remover a conta.';
      },
    });
  }

  obterCaminhoCategoria(categoria: Categoria): string {
    const natureza = this.categorias.find(c => c.id === categoria.categoriaPaiId);
    const tipo = this.categorias.find(c => c.id === natureza?.categoriaPaiId);
    return [tipo?.descricao, natureza?.descricao].filter(Boolean).join(' / ');
  }

  private limparMensagens(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
  }

  private obterCategoriasEspecificas(categorias: Categoria[]): Categoria[] {
    return categorias.filter(categoria => {
      const natureza = categorias.find(c => c.id === categoria.categoriaPaiId);
      const tipo = categorias.find(c => c.id === natureza?.categoriaPaiId);
      return categoria.tipoTransacao === this.tipoTransacaoDespesa && !!natureza && !!tipo && !tipo.categoriaPaiId;
    }).sort((a, b) => a.descricao.localeCompare(b.descricao));
  }
}
