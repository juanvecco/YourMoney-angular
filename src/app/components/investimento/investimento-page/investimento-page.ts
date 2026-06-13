import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize, Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';
import {
  AtualizarInvestimentoRequest,
  CriarInvestimentoRequest,
  Investimento,
  InvestimentoService
} from '../../../services/investimento';
import { AuthService } from '../../../services/auth.service';

interface InvestimentoForm {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  precoMedio: number;
  valorAtual: number;
  dataInvestimento: string;
  dataResgate: string | null;
  ativo: boolean;
}

@Component({
  selector: 'app-investimento-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investimento-page.html',
  styleUrls: ['./investimento-page.scss']
})
export class InvestimentoPageComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  investimentos: Investimento[] = [];
  mesAtual: Date = new Date();
  totalInvestimentos = 0;
  estadoCarregamento: FinancialViewState = 'loading';
  mensagemCarregamento = '';
  salvandoInvestimento = false;
  editando = false;
  novoInvestimento = this.criarFormularioVazio();

  @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

  constructor(
    private investimentoService: InvestimentoService,
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
    const mes = this.mesAtual.getMonth() + 1;
    const ano = this.mesAtual.getFullYear();
    this.investimentos = [];
    this.totalInvestimentos = 0;
    this.estadoCarregamento = 'loading';
    this.atualizarMensagemCarregamento();

    this.investimentoService.obterPorReferencia(mes, ano)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: dados => {
          this.investimentos = [...dados].sort(
            (a, b) => this.dataCivilParaDate(b.dataInvestimento).getTime() -
              this.dataCivilParaDate(a.dataInvestimento).getTime()
          );
          this.totalInvestimentos = dados.reduce((soma, investimento) => soma + investimento.valorAtual, 0);
          this.estadoCarregamento = dados.length > 0 ? 'loadedWithData' : 'emptyPeriod';
          this.atualizarMensagemCarregamento();
        },
        error: erro => {
          console.error('Erro ao carregar investimentos', erro);
          this.estadoCarregamento = 'loadError';
          this.atualizarMensagemCarregamento();
        }
      });
  }

  mudarMes(direcao: number): void {
    const novoMes = new Date(this.mesAtual);
    novoMes.setMonth(novoMes.getMonth() + direcao);
    this.mesAtual = novoMes;
    this.carregarInvestimentos();
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
    this.carregarInvestimentos();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  abrirModalInvestimento(): void {
    this.editando = false;
    this.novoInvestimento = this.criarFormularioVazio();
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
      dataResgate: investimento.dataResgate?.substring(0, 10) ?? null
    };
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
        next: investimento => {
          const dataCriada = this.dataCivilParaDate(investimento.dataInvestimento);
          this.mesAtual = new Date(dataCriada.getFullYear(), dataCriada.getMonth(), 1);
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
            this.investimentos = this.investimentos.filter(investimento => investimento.id !== id);
            this.totalInvestimentos = this.investimentos.reduce((soma, investimento) => soma + investimento.valorAtual, 0);
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
      dataResgate: null,
      ativo: true
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
      dataInvestimento: this.novoInvestimento.dataInvestimento
    };
  }

  private montarPayloadAtualizacao(): AtualizarInvestimentoRequest {
    return {
      ...this.montarPayloadCriacao(),
      id: this.novoInvestimento.id,
      dataResgate: this.novoInvestimento.dataResgate,
      ativo: this.novoInvestimento.ativo
    };
  }

  private validarFormulario(): string | null {
    if (!this.novoInvestimento.nome.trim()) return 'Informe o nome do investimento.';
    if (this.novoInvestimento.nome.trim().length > 100) return 'O nome deve ter no máximo 100 caracteres.';
    if (this.novoInvestimento.descricao.trim().length > 500) return 'A descrição deve ter no máximo 500 caracteres.';
    if (!this.novoInvestimento.tipo.trim()) return 'Informe o tipo do investimento.';
    if (this.novoInvestimento.tipo.trim().length > 100) return 'O tipo deve ter no máximo 100 caracteres.';
    if (this.novoInvestimento.quantidade <= 0) return 'A quantidade deve ser maior que zero.';
    if (this.novoInvestimento.precoMedio <= 0) return 'O preço médio deve ser maior que zero.';
    if (this.novoInvestimento.valorAtual <= 0) return 'O valor atual deve ser maior que zero.';
    if (!this.novoInvestimento.dataInvestimento) return 'Informe a data do investimento.';
    return null;
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

  private dataCivilParaDate(valor: string): Date {
    const [ano, mes, dia] = valor.substring(0, 10).split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  private dataLocalHoje(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private atualizarMensagemCarregamento(): void {
    this.mensagemCarregamento = financialStateMessage(this.estadoCarregamento, this.mesAtual, 'investimentos');
  }
}
