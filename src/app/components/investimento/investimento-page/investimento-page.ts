import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Investimento, InvestimentoService } from '../../../services/investimento';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-investimento-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './investimento-page.html',
  styleUrls: ['./investimento-page.css']
})
export class InvestimentoPageComponent {

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

  constructor(private investimentoService: InvestimentoService) {
    this.carregarDadosIniciais();
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
      title: 'Confirmação',
      text: 'Tem certeza que deseja deletar este investimento?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.investimentoService.deletarInvestimento(id).subscribe({
          next: () => {
            this.investimentos = this.investimentos.filter(d => d.id !== id);
            this.totalInvestimentos = this.investimentos.reduce((soma, d) => soma + d.valorAtual, 0);
            Swal.fire('Deletado!', 'Investimento deletado com sucesso.', 'success');
          },
          error: (erro) => {
            console.error('Erro ao deletar investimento', erro);
            Swal.fire('Erro!', 'Não foi possível deletar o investimento.', 'error');
          }
        });
      }
    });
  }

  // carregarDados() {
  // this.loading = true;

  // Simulando dados para demonstração
  // Em uma implementação real, estes dados viriam do serviço
  // this.investimentos = [
  //   {
  //     id: 1,
  //     ativo: 'Tesouro Selic 2029',
  //     tipo: 'Renda Fixa',
  //     quantidade: 10,
  //     precoMedio: 950.00,
  //     valorAtual: 10200.00,
  //     rentabilidade: 2.6,
  //     dataCompra: new Date('2024-01-15')
  //   },
  //   {
  //     id: 2,
  //     ativo: 'ITUB4',
  //     tipo: 'Renda Variável',
  //     quantidade: 200,
  //     precoMedio: 32.50,
  //     valorAtual: 6800.00,
  //     rentabilidade: 4.6,
  //     dataCompra: new Date('2024-03-10')
  //   },
  //   {
  //     id: 3,
  //     ativo: 'PETR4',
  //     tipo: 'Renda Variável',
  //     quantidade: 150,
  //     precoMedio: 28.00,
  //     valorAtual: 4050.00,
  //     rentabilidade: -3.6,
  //     dataCompra: new Date('2024-02-20')
  //   },
  //   {
  //     id: 4,
  //     ativo: 'Fundo Multimercado XP',
  //     tipo: 'Fundo',
  //     quantidade: 600,
  //     precoMedio: 10.00,
  //     valorAtual: 6100.00,
  //     rentabilidade: 1.7,
  //     dataCompra: new Date('2024-01-05')
  //   }
  // ];

  // this.resumo = {
  //   totalInvestido: 25000.00,
  //   rentabilidade: 8.6,
  //   patrimonioTotal: 27150.00
  // };

  // this.distribuicao = [
  //   { categoria: 'Renda Fixa', valor: 10200.00, percentual: 37.6 },
  //   { categoria: 'Renda Variável', valor: 10850.00, percentual: 40.0 },
  //   { categoria: 'Fundos', valor: 6100.00, percentual: 22.4 }
  // ];

  // this.loading = false;
  // }

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

