import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import {
  AtualizarInvestimentoRequest,
  CriarInvestimentoRequest,
  Investimento,
  InvestimentoService
} from '../../../services/investimento';
import { AuthService } from '../../../services/auth.service';
import { ReceitaRecorrenteService } from '../../../services/receita-recorrente';
import { ReservaSalarial } from '../../../models/investimento.model';
import { SalarioElegivelInvestimento } from '../../../models/receita-recorrente.model';

interface InvestimentoForm {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  precoMedio: number;
  valorAtual: number;
  dataInvestimento: string;
  mesReferencia: string;
  receitaRecorrenteId: string | null;
  operacaoId: string;
}

interface OpcaoReserva extends SalarioElegivelInvestimento {
  historica?: boolean;
}

@Component({
  selector: 'app-investimento-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './investimento-page.html',
  styleUrls: ['./investimento-page.scss']
})
export class InvestimentoPageComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  investimentos: Investimento[] = [];
  reservas: ReservaSalarial[] = [];
  salariosElegiveis: OpcaoReserva[] = [];
  totalInvestimentos = 0;
  estadoCarregamento: 'loading' | 'loadedWithData' | 'emptyPeriod' | 'loadError' = 'loading';
  salvandoInvestimento = false;
  editando = false;
  carregandoSalarios = false;
  novoInvestimento = this.criarFormularioVazio();

  constructor(
    private investimentoService: InvestimentoService,
    private receitaRecorrenteService: ReceitaRecorrenteService,
    private authService: AuthService,
    private router: Router
  ) {
    this.carregarInvestimentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarInvestimentos(): void {
    this.investimentos = [];
    this.reservas = [];
    this.totalInvestimentos = 0;
    this.estadoCarregamento = 'loading';

    this.investimentoService.obterConsolidado()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: carteira => {
          this.investimentos = carteira.itens;
          this.reservas = carteira.reservas;
          this.totalInvestimentos = carteira.totalInvestido;
          this.estadoCarregamento = carteira.itens.length > 0 ? 'loadedWithData' : 'emptyPeriod';
        },
        error: erro => {
          console.error('Erro ao carregar investimentos', erro);
          this.estadoCarregamento = 'loadError';
        }
      });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  abrirModalInvestimento(): void {
    this.editando = false;
    this.novoInvestimento = this.criarFormularioVazio();
    this.carregarSalariosElegiveis();
    const modalElement = document.getElementById('modalInvestimento');
    if (modalElement) {
      new (window as any).bootstrap.Modal(modalElement).show();
    }
  }

  abrirModalEditar(investimento: Investimento): void {
    this.editando = true;
    this.novoInvestimento = {
      ...investimento,
      dataInvestimento: investimento.dataInvestimento.substring(0, 10),
      mesReferencia: (investimento.mesReferencia ?? investimento.dataInvestimento).substring(0, 7),
      receitaRecorrenteId: investimento.receitaRecorrenteId ?? null,
      operacaoId: ''
    };
    this.carregarSalariosElegiveis(investimento);
    const modalElement = document.getElementById('modalInvestimento');
    if (modalElement) {
      new (window as any).bootstrap.Modal(modalElement).show();
    }
  }

  salvarInvestimento(): void {
    if (this.salvandoInvestimento) {
      return;
    }

    const mensagemValidacao = this.validarFormulario();
    if (mensagemValidacao) {
      this.mostrarAviso(mensagemValidacao);
      return;
    }

    const request$ = this.editando
      ? this.investimentoService.atualizarInvestimento(this.montarPayloadAtualizacao())
      : this.investimentoService.criarInvestimento(this.montarPayloadCriacao());

    this.salvandoInvestimento = true;
    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.salvandoInvestimento = false)
      )
      .subscribe({
        next: () => {
          this.fecharModal();
          this.carregarInvestimentos();
          this.mostrarSucesso();
        },
        error: erro => {
          console.error('Erro ao salvar investimento', erro);
          this.mostrarErro(erro);
        }
      });
  }

  deletarInvestimento(id: string): void {
    Swal.fire({
      title: 'Deletar?',
      text: 'Não pode ser desfeito.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim',
      cancelButtonText: 'Não',
      confirmButtonColor: '#dc3545'
    }).then(result => {
      if (!result.isConfirmed) return;

      this.investimentoService.deletarInvestimento(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.carregarInvestimentos();
            Swal.fire('Deletado!', '', 'success');
          },
          error: () => Swal.fire('Erro!', '', 'error')
        });
    });
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  private criarFormularioVazio(): InvestimentoForm {
    return {
      id: '',
      nome: '',
      descricao: '',
      tipo: '',
      quantidade: 0,
      precoMedio: 0,
      valorAtual: 0,
      dataInvestimento: this.dataLocalHoje(),
      mesReferencia: this.mesLocalAtual(),
      receitaRecorrenteId: null,
      operacaoId: this.novaOperacaoId()
    };
  }

  private montarPayloadCriacao(): CriarInvestimentoRequest {
    return {
      nome: this.novoInvestimento.nome.trim(),
      descricao: this.novoInvestimento.descricao.trim(),
      tipo: this.novoInvestimento.tipo.trim(),
      quantidade: this.novoInvestimento.quantidade,
      precoMedio: this.novoInvestimento.precoMedio,
      valorAtual: this.novoInvestimento.valorAtual,
      dataInvestimento: this.novoInvestimento.dataInvestimento,
      mesReferencia: `${this.novoInvestimento.mesReferencia}-01`,
      receitaRecorrenteId: this.novoInvestimento.receitaRecorrenteId || null,
      operacaoId: this.novoInvestimento.operacaoId
    };
  }

  private montarPayloadAtualizacao(): AtualizarInvestimentoRequest {
    const { operacaoId: _, ...payload } = this.montarPayloadCriacao();
    return {
      ...payload,
      id: this.novoInvestimento.id
    };
  }

  private validarFormulario(): string | null {
    if (!this.novoInvestimento.nome.trim()) return 'Informe o nome do investimento.';
    if (this.novoInvestimento.nome.trim().length > 100) return 'O nome deve ter no máximo 100 caracteres.';
    if (!this.novoInvestimento.descricao.trim()) return 'Informe a descrição do investimento.';
    if (this.novoInvestimento.descricao.trim().length > 500) return 'A descrição deve ter no máximo 500 caracteres.';
    if (!this.novoInvestimento.tipo.trim()) return 'Informe o tipo do investimento.';
    if (this.novoInvestimento.tipo.trim().length > 100) return 'O tipo deve ter no máximo 100 caracteres.';
    if (this.novoInvestimento.quantidade <= 0) return 'A quantidade deve ser maior que zero.';
    if (this.novoInvestimento.precoMedio <= 0) return 'O preço médio deve ser maior que zero.';
    if (this.novoInvestimento.valorAtual <= 0) return 'O valor atual deve ser maior que zero.';
    if (!this.novoInvestimento.dataInvestimento) return 'Informe a data do investimento.';
    if (!this.novoInvestimento.mesReferencia) return 'Informe o mês de referência.';
    return null;
  }

  formatarPercentual(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor) + '%';
  }

  larguraProgresso(valor: number): number {
    return Math.min(Math.max(valor, 0), 100);
  }

  formatarDataCivil(valor: string): string {
    const [ano, mes, dia] = valor.substring(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  private carregarSalariosElegiveis(investimentoHistorico?: Investimento): void {
    this.carregandoSalarios = true;
    this.salariosElegiveis = [];
    this.receitaRecorrenteService.listarElegiveisParaInvestimento()
      .pipe(takeUntil(this.destroy$), finalize(() => this.carregandoSalarios = false))
      .subscribe({
        next: resposta => {
          this.salariosElegiveis = resposta.itens;
          this.incluirOpcaoHistorica(investimentoHistorico);
        },
        error: () => this.incluirOpcaoHistorica(investimentoHistorico)
      });
  }

  private incluirOpcaoHistorica(investimento?: Investimento): void {
    if (!investimento?.receitaRecorrenteId || !investimento.reservaAssociada) return;
    if (this.salariosElegiveis.some(item => item.id === investimento.receitaRecorrenteId)) return;
    this.salariosElegiveis.unshift({
      id: investimento.receitaRecorrenteId,
      descricao: investimento.reservaAssociada.descricao,
      contaDescricao: investimento.reservaAssociada.contaDescricao,
      valorPrevisto: 0,
      historica: true
    });
  }

  private novaOperacaoId(): string {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private mostrarAviso(mensagem: string): void {
    Swal.fire({
      icon: 'warning',
      title: 'Revise os dados',
      text: mensagem,
      confirmButtonColor: '#b49452'
    });
  }

  private mostrarSucesso(): void {
    Swal.fire({
      icon: 'success',
      title: this.editando ? 'Investimento atualizado!' : 'Investimento cadastrado!',
      text: this.editando
        ? 'Seu investimento foi atualizado com sucesso.'
        : 'Seu investimento foi registrado com sucesso.',
      confirmButtonColor: '#b49452'
    });
  }

  private mostrarErro(erro: unknown): void {
    Swal.fire({
      icon: 'error',
      title: 'Não foi possível salvar',
      text: this.extrairMensagemErro(erro),
      confirmButtonColor: '#b49452'
    });
  }

  private extrairMensagemErro(erro: unknown): string {
    const httpError = erro as HttpErrorResponse & {
      error?: {
        message?: string;
        title?: string;
        errors?: Record<string, string[]>;
      };
    };

    if (httpError.status === 401) return 'Sessão expirada. Faça login novamente.';
    if (httpError.status === 403) return 'Você não tem permissão para cadastrar este investimento.';
    if (httpError.status === 409) return 'Esta operação já foi enviada com dados diferentes. Reabra o cadastro e tente novamente.';
    if ([0, 502, 503, 504].includes(httpError.status)) {
      return 'Serviço temporariamente indisponível. Tente novamente.';
    }

    const validationMessages = httpError.error?.errors
      ? Object.values(httpError.error.errors).flat()
      : [];

    return validationMessages.join(', ') ||
      httpError.error?.message ||
      httpError.error?.title ||
      'Não foi possível salvar o investimento. Revise os dados e tente novamente.';
  }

  private fecharModal(): void {
    const modal = document.getElementById('modalInvestimento');
    (window as any).bootstrap?.Modal.getInstance(modal)?.hide();
  }

  private dataLocalHoje(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private mesLocalAtual(): string {
    return this.dataLocalHoje().substring(0, 7);
  }

}
