import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import {
  AtualizarMetaMensalRequest,
  CriarMetaMensalRequest,
  MetaMensal,
  MetaMensalStatus,
  MetasMensaisResumo,
  TipoDefinicaoMeta
} from '../../../models/meta-mensal.model';
import { AuthService } from '../../../services/auth.service';
import { MetaMensalService } from '../../../services/meta-mensal';

type MetasViewState = 'loading' | 'loaded' | 'empty' | 'error';

@Component({
  selector: 'app-metas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './metas-page.html',
  styleUrls: ['./metas-page.scss']
})
export class MetasPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private definicaoOriginal: Pick<MetaMensal, 'tipoDefinicao' | 'percentualReceita' | 'valorMeta'> | null = null;

  @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

  resumo: MetasMensaisResumo | null = null;
  metas: MetaMensal[] = [];
  estado: MetasViewState = 'loading';
  mensagemErro = '';
  mesAtual = new Date();
  salvando = false;
  editando = false;
  formulario: {
    id: string;
    nome: string;
    tipoDefinicao: TipoDefinicaoMeta;
    percentualReceita: number | null;
    valorMeta: number | null;
  } = {
    id: '',
    nome: '',
    tipoDefinicao: 'Percentual',
    percentualReceita: null,
    valorMeta: null
  };

  constructor(
    private metaMensalService: MetaMensalService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.carregarResumo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarResumo(): void {
    const mes = this.mesAtual.getMonth() + 1;
    const ano = this.mesAtual.getFullYear();
    this.estado = 'loading';
    this.mensagemErro = '';

    this.metaMensalService.obterResumo(mes, ano)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resumo) => {
          this.resumo = resumo;
          this.metas = resumo.metas;
          this.estado = resumo.metas.length > 0 ? 'loaded' : 'empty';
        },
        error: () => {
          this.estado = 'error';
          this.resumo = null;
          this.metas = [];
          this.mensagemErro = 'Não foi possível carregar as metas do mês.';
        }
      });
  }

  salvarMeta(): void {
    if (this.salvando || !this.formularioValido()) return;

    this.salvando = true;
    this.mensagemErro = '';

    const request = this.editando
      ? this.criarRequestAtualizacao()
      : this.criarRequestCadastro();
    const operacao$ = this.editando
      ? this.metaMensalService.atualizarMeta(request as AtualizarMetaMensalRequest)
      : this.metaMensalService.criarMeta(request as CriarMetaMensalRequest);

    operacao$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.resetarFormulario();
        this.salvando = false;
        this.carregarResumo();
      },
      error: (erro: HttpErrorResponse) => {
        this.mensagemErro = this.obterMensagemErro(erro);
        this.salvando = false;
      }
    });
  }

  alterarTipoDefinicao(tipoDefinicao: TipoDefinicaoMeta): void {
    if (tipoDefinicao === this.formulario.tipoDefinicao) return;

    this.formulario.tipoDefinicao = tipoDefinicao;
    this.formulario.percentualReceita = null;
    this.formulario.valorMeta = null;
    this.mensagemErro = '';
  }

  editarMeta(meta: MetaMensal): void {
    this.editando = true;
    this.formulario = {
      id: meta.id,
      nome: meta.nome,
      tipoDefinicao: meta.tipoDefinicao,
      percentualReceita: meta.tipoDefinicao === 'Percentual' ? meta.percentualReceita : null,
      valorMeta: meta.tipoDefinicao === 'Valor' ? meta.valorMeta : null
    };
    this.definicaoOriginal = {
      tipoDefinicao: meta.tipoDefinicao,
      percentualReceita: meta.percentualReceita,
      valorMeta: meta.valorMeta
    };
    this.mensagemErro = '';
  }

  cancelarEdicao(): void {
    this.resetarFormulario();
  }

  excluirMeta(meta: MetaMensal): void {
    if (!confirm(`Excluir a meta "${meta.nome}"?`)) return;

    this.metaMensalService.deletarMeta(meta.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.carregarResumo(),
        error: () => {
          this.mensagemErro = 'Não foi possível excluir a meta.';
        }
      });
  }

  mudarMes(direcao: number): void {
    const novoMes = new Date(this.mesAtual);
    novoMes.setMonth(novoMes.getMonth() + direcao);
    this.mesAtual = novoMes;
    this.resetarFormulario();
    this.carregarResumo();
  }

  abrirCalendario(): void {
    const input = this.calendarioInput.nativeElement;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
  }

  selecionarMesDoCalendario(event: Event): void {
    const input = event.target as HTMLInputElement;
    const [ano, mes] = input.value.split('-').map(Number);
    this.mesAtual = new Date(ano, mes - 1, 1);
    this.resetarFormulario();
    this.carregarResumo();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formularioValido(): boolean {
    const nome = this.formulario.nome.trim();
    if (!nome || nome.length > 100) return false;

    if (this.formulario.tipoDefinicao === 'Percentual') {
      return this.valorValido(this.formulario.percentualReceita, 4);
    }

    return this.valorValido(this.formulario.valorMeta, 2)
      && (this.temReceitaElegivelPositiva || this.podeRenomearMetaPorValorSemReceita());
  }

  formatarMoeda(valor = 0): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatarPercentual(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || !Number.isFinite(valor)) {
      return 'Indisponível';
    }

    return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  }

  obterStatusTexto(status?: MetaMensalStatus): string {
    const rotulos: Record<MetaMensalStatus, string> = {
      disponivel: 'Há dinheiro disponível',
      zerado: 'Planejamento zerado',
      faltando: 'Está faltando dinheiro'
    };
    return rotulos[status ?? 'zerado'];
  }

  get temAlertas(): boolean {
    return !!this.resumo?.alertas?.length;
  }

  get temReceitaElegivelPositiva(): boolean {
    return (this.resumo?.receitaElegivelMetas ?? this.resumo?.receitaTotal ?? 0) > 0;
  }

  private resetarFormulario(): void {
    this.editando = false;
    this.definicaoOriginal = null;
    this.formulario = {
      id: '',
      nome: '',
      tipoDefinicao: 'Percentual',
      percentualReceita: null,
      valorMeta: null
    };
  }

  private criarRequestCadastro(): CriarMetaMensalRequest {
    const base = {
      nome: this.formulario.nome.trim(),
      mesReferencia: this.converterMesReferenciaParaApi(this.mesAtual)
    };

    return this.formulario.tipoDefinicao === 'Valor'
      ? { ...base, tipoDefinicao: 'Valor', valorMeta: Number(this.formulario.valorMeta), percentualReceita: null }
      : { ...base, tipoDefinicao: 'Percentual', percentualReceita: Number(this.formulario.percentualReceita), valorMeta: null };
  }

  private criarRequestAtualizacao(): AtualizarMetaMensalRequest {
    const base = {
      id: this.formulario.id,
      nome: this.formulario.nome.trim()
    };

    return this.formulario.tipoDefinicao === 'Valor'
      ? { ...base, tipoDefinicao: 'Valor', valorMeta: Number(this.formulario.valorMeta), percentualReceita: null }
      : { ...base, tipoDefinicao: 'Percentual', percentualReceita: Number(this.formulario.percentualReceita), valorMeta: null };
  }

  private valorValido(valor: number | null, casasDecimais: number): boolean {
    if (valor === null || !Number.isFinite(Number(valor)) || Number(valor) <= 0) return false;

    const fator = 10 ** casasDecimais;
    return Math.abs(Number(valor) * fator - Math.round(Number(valor) * fator)) < 0.0000001;
  }

  private podeRenomearMetaPorValorSemReceita(): boolean {
    return this.editando
      && this.definicaoOriginal?.tipoDefinicao === 'Valor'
      && Number(this.definicaoOriginal.valorMeta) === Number(this.formulario.valorMeta);
  }

  private obterMensagemErro(erro: HttpErrorResponse): string {
    const mensagem = erro.error?.message;
    return typeof mensagem === 'string' && mensagem.trim()
      ? mensagem
      : 'Não foi possível salvar a meta.';
  }

  private converterMesReferenciaParaApi(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}-01`;
  }
}
