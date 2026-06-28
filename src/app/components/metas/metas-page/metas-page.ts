import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MetaMensal, MetaMensalStatus, MetasMensaisResumo } from '../../../models/meta-mensal.model';
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

  @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

  resumo: MetasMensaisResumo | null = null;
  metas: MetaMensal[] = [];
  estado: MetasViewState = 'loading';
  mensagemErro = '';
  mesAtual = new Date();
  salvando = false;
  editando = false;
  formulario = { id: '', nome: '', percentualReceita: 0 };

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
    const request = {
      nome: this.formulario.nome.trim(),
      percentualReceita: Number(this.formulario.percentualReceita)
    };
    const operacao$ = this.editando
      ? this.metaMensalService.atualizarMeta({ id: this.formulario.id, ...request })
      : this.metaMensalService.criarMeta({ ...request, mesReferencia: this.converterMesReferenciaParaApi(this.mesAtual) });

    operacao$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.resetarFormulario();
        this.carregarResumo();
        this.salvando = false;
      },
      error: () => {
        this.mensagemErro = 'Não foi possível salvar a meta.';
        this.salvando = false;
      }
    });
  }

  editarMeta(meta: MetaMensal): void {
    this.editando = true;
    this.formulario = {
      id: meta.id,
      nome: meta.nome,
      percentualReceita: meta.percentualReceita
    };
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
    return this.formulario.nome.trim().length > 0
      && this.formulario.nome.trim().length <= 100
      && Number(this.formulario.percentualReceita) > 0;
  }

  formatarMoeda(valor = 0): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatarPercentual(valor = 0): string {
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

  private resetarFormulario(): void {
    this.editando = false;
    this.formulario = { id: '', nome: '', percentualReceita: 0 };
  }

  private converterMesReferenciaParaApi(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}-01`;
  }
}
