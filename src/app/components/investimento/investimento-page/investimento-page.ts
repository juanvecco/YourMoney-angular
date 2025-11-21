import { Component, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Investimento, InvestimentoService } from '../../../services/investimento';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';

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

  novoInvestimento = {
    id: '',
    nome: '',
    descricao: '',
    tipo: '',
    quantidade: 0,
    precoMedio: 0,
    valorAtual: 0,
    dataInvestimento: new Date().toISOString().split('T')[0],
    dataResgate: new Date().toISOString().split('T')[0],
    ativo: true
  };

  @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

  constructor(private investimentoService: InvestimentoService) {
    this.carregarDadosIniciais();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarDadosIniciais() {
    this.carregarInvestimentos();
  }

  carregarInvestimentos() {
    const mes = this.mesAtual.getMonth() + 1;
    const ano = this.mesAtual.getFullYear();
    this.investimentoService.obterPorReferencia(mes, ano).subscribe({
      next: (dados) => {
        this.investimentos = dados.sort((a, b) => {
          return new Date(b.dataInvestimento).getTime() - new Date(a.dataInvestimento).getTime();
        });
        this.totalInvestimentos = dados.reduce((soma, d) => soma + d.valorAtual, 0);
      },
      error: (erro) => console.error('Erro ao carregar investimentos', erro)
    });
  }

  mudarMes(direcao: number) {
    const novoMes = new Date(this.mesAtual);
    novoMes.setMonth(novoMes.getMonth() + direcao);
    this.mesAtual = novoMes;
    this.carregarInvestimentos();
  }

  // === CALENDÁRIO ===
  abrirCalendario() {
    const input = this.calendarioInput.nativeElement;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    } else {
      input.click();
    }
  }

  selecionarMesDoCalendario(event: Event) {
    const input = event.target as HTMLInputElement;
    const [ano, mes] = input.value.split('-').map(Number);
    this.mesAtual = new Date(ano, mes - 1, 1);
    this.carregarInvestimentos();
  }

  editando: boolean = false;

  abrirModalInvestimento() {
    this.editando = false;
    this.novoInvestimento = {
      id: '',
      nome: '',
      descricao: '',
      tipo: '',
      quantidade: 0,
      precoMedio: 0,
      valorAtual: 0,
      dataInvestimento: new Date().toISOString().split('T')[0],
      dataResgate: new Date().toISOString().split('T')[0],
      ativo: true
    };
    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalInvestimento'));
    modal.show();
  }

  abrirModalEditar(investimento: Investimento) {
    this.editando = true;
    this.novoInvestimento = {
      ...investimento,
      dataInvestimento: new Date(investimento.dataInvestimento).toISOString().split('T')[0],
      dataResgate: new Date(investimento.dataResgate).toISOString().split('T')[0]
    };
    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalInvestimento'));
    modal.show();
  }
  salvarInvestimento() {
    if (!this.novoInvestimento.nome || !this.novoInvestimento.valorAtual || !this.novoInvestimento.dataInvestimento) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos obrigatórios!',
        text: 'Preencha todos os campos antes de salvar.',
        confirmButtonColor: '#b49452',
        background: '#f8f8f8',
        color: '#283b6b',
      });
      return;
    }

    const request$ = this.editando
      ? this.investimentoService.atualizarInvestimento(this.novoInvestimento)
      : this.investimentoService.criarInvestimento(this.novoInvestimento);

    request$.subscribe({
      next: () => {
        const modal = document.getElementById('modalInvestimento');
        (window as any).bootstrap.Modal.getInstance(modal)?.hide();
        this.carregarInvestimentos();

        Swal.fire({
          icon: 'success',
          title: this.editando ? 'Investimento atualizado!' : 'Investimento cadastrado!',
          text: this.editando
            ? 'Seu investimento foi atualizado com sucesso.'
            : 'Seu investimento foi registrado com sucesso.',
          confirmButtonColor: '#b49452',
          background: '#f8f8f8',
          color: '#283b6b',
        });
      },
      error: (erro) => {
        console.error('Erro ao salvar investimento', erro);
        Swal.fire({
          icon: 'error',
          title: 'Erro!',
          text: this.editando
            ? 'Não foi possível atualizar o investimento.'
            : 'Não foi possível salvar o investimento.',
          confirmButtonColor: '#b49452',
          background: '#f8f8f8',
          color: '#283b6b',
        });
      }
    });
  }

  deletarInvestimento(id: string) {
    Swal.fire({
      title: 'Deletar?', text: 'Não pode ser desfeito.', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sim', cancelButtonText: 'Não',
      confirmButtonColor: '#dc3545'
    }).then(result => {
      if (result.isConfirmed) {
        this.investimentoService.deletarInvestimento(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.investimentos = this.investimentos.filter(d => d.id !== id);
              this.totalInvestimentos = this.investimentos.reduce((s, d) => s + d.valorAtual, 0);
              Swal.fire('Deletado!', '', 'success');
            },
            error: () => Swal.fire('Erro!', '', 'error')
          });
      }
    });
  }

  adicionarInvestimento(): void {
    // Implementar lógica para adicionar investimento
    console.log('Adicionar investimento');
  }

  editarInvestimento(id: number): void {
    // Implementar lógica para editar investimento
    console.log('Editar investimento:', id);
  }

  excluirInvestimento(id: number): void {
    if (confirm('Tem certeza que deseja excluir este investimento?')) {
      // Implementar lógica para excluir investimento
      console.log('Excluir investimento:', id);
    }
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  formatarPercentual(valor: number): string {
    const sinal = valor >= 0 ? '+' : '';
    return `${sinal}${valor.toFixed(1)}%`;
  }

  obterClasseRentabilidade(rentabilidade: number): string {
    return rentabilidade >= 0 ? 'positive' : 'negative';
  }
}

