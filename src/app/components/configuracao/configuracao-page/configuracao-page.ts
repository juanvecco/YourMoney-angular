import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, Optional } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Categoria, ContaFinanceira } from '../../../models/despesa.model';
import { CategoriaPayload, CategoriaService } from '../../../services/categoria';
import { ContaFinanceiraService } from '../../../services/conta';
import { FeedbackService } from '../../../services/feedback.service';
import { CriarCategoriaComponent } from '../../categoria/criar-categoria/criar-categoria';
import { PageHeaderComponent } from '../../shared/page-header/page-header';
import { ViewStateComponent } from '../../shared/view-state/view-state';
import { RegraNegocio } from '../../../models/regra-negocio.model';
import { RegraNegocioService } from '../../../services/regra-negocio.service';
import { AuthService } from '../../../services/auth.service';
import { ExternalAccountLinkStatus, PendingGoogleLink } from '../../../models/auth.model';

type SecaoConfiguracao = 'categorias' | 'contas' | 'conexoes' | 'regras' | 'seguranca';

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
  regras: RegraNegocio[] = [];
  buscaRegras = '';
  carregandoRegras = false;
  erroRegras = '';
  salvandoRegraCodigo = '';
  carregandoVinculoGoogle = false;
  vinculandoGoogle = false;
  googleLinkStatus: ExternalAccountLinkStatus | null = null;
  googleLinkPendente: PendingGoogleLink | null = null;
  senhaAtualGoogle = '';
  erroVinculoGoogle = '';
  sucessoVinculoGoogle = '';

  constructor(
    private readonly categoriaService: CategoriaService,
    private readonly contaService: ContaFinanceiraService,
    private readonly feedback: FeedbackService,
    private readonly regraNegocioService: RegraNegocioService,
    private readonly authService: AuthService,
    @Optional() private readonly route: ActivatedRoute | null = null,
    @Optional() private readonly router: Router | null = null,
  ) {}

  ngOnInit(): void {
    const secaoSolicitada = this.route?.snapshot.queryParamMap.get('secao');
    if (secaoSolicitada === 'contas' || secaoSolicitada === 'regras' || secaoSolicitada === 'seguranca') this.secao = secaoSolicitada;
    const resultadoGoogle = this.route?.snapshot.queryParamMap.get('google');
    if (resultadoGoogle === 'pendente') this.carregarGooglePendente();
    else if (resultadoGoogle === 'conectado') this.sucessoVinculoGoogle = 'Google conectado à sua conta YourMoney.';
    else if (resultadoGoogle === 'conflito') this.erroVinculoGoogle = 'Esta conta Google já está conectada a outra conta. Nenhum vínculo foi alterado.';
    else if (resultadoGoogle === 'email-diferente') this.erroVinculoGoogle = 'Escolha o Google que usa o mesmo e-mail verificado da sua conta YourMoney.';
    else if (resultadoGoogle === 'cancelado') this.sucessoVinculoGoogle = 'Conexão cancelada. Sua conta não foi alterada.';
    else if (resultadoGoogle === 'erro') this.erroVinculoGoogle = 'Não foi possível conectar o Google. Sua conta e seus dados continuam inalterados. Tente novamente.';
    this.carregarStatusVinculoGoogle();
    this.carregarCategorias();
    this.carregarContas();
    this.carregarInstituicoesBancarias();
    this.carregarRegras();
  }

  regraAtiva(codigo: string): boolean {
    return this.regraNegocioService.estaAtiva(codigo);
  }

  selecionarSecao(secao: SecaoConfiguracao): void {
    this.secao = secao;
    this.limparMensagens();
    if (secao === 'regras') this.carregarRegras();
    if (secao === 'seguranca') this.carregarStatusVinculoGoogle();
  }

  carregarStatusVinculoGoogle(): void {
    this.carregandoVinculoGoogle = true;
    this.authService.getExternalAccountLinkStatus().subscribe({
      next: status => {
        this.googleLinkStatus = status;
        this.carregandoVinculoGoogle = false;
      },
      error: () => {
        this.googleLinkStatus = null;
        this.carregandoVinculoGoogle = false;
        this.erroVinculoGoogle ||= 'Não foi possível consultar os métodos de acesso. Atualize a página e tente novamente.';
      },
    });
  }

  carregarGooglePendente(): void {
    this.secao = 'seguranca';
    this.authService.getPendingGoogleLink().subscribe({
      next: pending => this.googleLinkPendente = pending,
      error: () => {
        this.googleLinkPendente = null;
        this.erroVinculoGoogle = 'A confirmação expirou ou sua sessão terminou. Entre novamente e inicie a conexão do Google.';
        this.limparResultadoPendenteGoogle();
      },
    });
  }

  iniciarVinculoGoogle(): void {
    if (this.vinculandoGoogle) return;
    if (!this.senhaAtualGoogle) {
      this.erroVinculoGoogle = 'Digite a senha atual da sua conta YourMoney para continuar.';
      return;
    }
    this.erroVinculoGoogle = '';
    this.sucessoVinculoGoogle = '';
    this.vinculandoGoogle = true;
    this.authService.prepareGoogleLink(this.senhaAtualGoogle).subscribe({
      next: result => {
        try {
          this.authService.startGoogleLink(result.continuationPath);
        } catch {
          this.vinculandoGoogle = false;
          this.erroVinculoGoogle = 'Não foi possível iniciar a conexão com Google. Tente novamente.';
        }
      },
      error: error => {
        this.vinculandoGoogle = false;
        this.erroVinculoGoogle = this.mensagemFalhaVinculo(error);
      },
    });
  }

  confirmarVinculoGoogle(): void {
    if (!this.googleLinkPendente || this.vinculandoGoogle) return;
    this.vinculandoGoogle = true;
    this.erroVinculoGoogle = '';
    this.authService.confirmGoogleLink().subscribe({
      next: status => {
        this.googleLinkStatus = status;
        this.googleLinkPendente = null;
        this.senhaAtualGoogle = '';
        this.vinculandoGoogle = false;
        this.sucessoVinculoGoogle = 'Google conectado à sua conta YourMoney. Seu acesso por e-mail e senha continua ativo.';
        this.limparResultadoPendenteGoogle();
      },
      error: error => {
        this.vinculandoGoogle = false;
        this.erroVinculoGoogle = this.mensagemFalhaVinculo(error);
        this.carregarStatusVinculoGoogle();
      },
    });
  }

  cancelarVinculoGoogle(): void {
    if (this.vinculandoGoogle) return;
    this.vinculandoGoogle = true;
    this.authService.cancelGoogleLink().subscribe({
      next: () => {
        this.googleLinkPendente = null;
        this.vinculandoGoogle = false;
        this.sucessoVinculoGoogle = 'Conexão cancelada. Sua conta não foi alterada.';
        this.limparResultadoPendenteGoogle();
      },
      error: () => {
        this.googleLinkPendente = null;
        this.vinculandoGoogle = false;
        this.erroVinculoGoogle = 'A confirmação foi cancelada nesta tela. Se a tentativa ainda estiver ativa, ela expirará em poucos minutos.';
      },
    });
  }

  private mensagemFalhaVinculo(error: HttpErrorResponse): string {
    const message = error.error?.mensagem || error.error?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (error.status === 401) return 'Sua sessão expirou. Entre novamente e inicie a conexão do Google.';
    if (error.status === 409) return 'Esta conta Google já está conectada a outra conta ou o método já está conectado aqui.';
    if (error.status === 422) return 'O Google precisa usar o mesmo e-mail verificado da sua conta YourMoney.';
    if (error.status === 503) return 'A conexão com Google não está disponível no momento.';
    return 'Não foi possível concluir a conexão. Sua conta e seus dados permanecem inalterados.';
  }

  private limparResultadoPendenteGoogle(): void {
    if (!this.router || !this.route) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { google: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  carregarRegras(forcar = false): void {
    this.carregandoRegras = true;
    this.erroRegras = '';
    this.regraNegocioService.carregar(forcar).subscribe({
      next: regras => {
        this.regras = regras;
        this.carregandoRegras = false;
      },
      error: () => {
        this.erroRegras = 'Não foi possível carregar as regras. Tente novamente.';
        this.carregandoRegras = false;
      },
    });
  }

  get regrasFiltradas(): RegraNegocio[] {
    const termo = this.normalizarBusca(this.buscaRegras);
    if (!termo) return this.regras;
    return this.regras.filter(regra =>
      this.normalizarBusca(`${regra.nome} ${regra.descricao} ${regra.grupo}`).includes(termo));
  }

  get gruposRegras(): { nome: string; regras: RegraNegocio[] }[] {
    const grupos = new Map<string, RegraNegocio[]>();
    for (const regra of this.regrasFiltradas) {
      const grupo = grupos.get(regra.grupo) ?? [];
      grupo.push(regra);
      grupos.set(regra.grupo, grupo);
    }
    return Array.from(grupos, ([nome, regras]) => ({ nome, regras }));
  }

  dependenciaDescricao(regra: RegraNegocio): string {
    const pendentes = regra.dependencias.filter(codigo =>
      !this.regras.find(item => item.codigo === codigo)?.efetiva);
    return pendentes.map(codigo => this.regras.find(item => item.codigo === codigo)?.nome ?? codigo).join(', ');
  }

  alterarRegra(regra: RegraNegocio, ativa: boolean): void {
    if (this.salvandoRegraCodigo) return;
    const anterior = regra.ativa;
    regra.ativa = ativa;
    this.salvandoRegraCodigo = regra.codigo;
    this.erroRegras = '';
    this.regraNegocioService.atualizar(regra.codigo, ativa).subscribe({
      next: atualizada => {
        regra.ativa = atualizada.ativa;
        regra.efetiva = atualizada.efetiva;
        this.regras = [...(this.regraNegocioService.regras() ?? this.regras)];
        this.salvandoRegraCodigo = '';
      },
      error: () => {
        regra.ativa = anterior;
        this.erroRegras = `Não foi possível salvar “${regra.nome}”. Tente novamente.`;
        this.salvandoRegraCodigo = '';
      },
    });
  }

  private normalizarBusca(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
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
