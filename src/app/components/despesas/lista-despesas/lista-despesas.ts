import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DespesaService, Despesa, Categoria } from '../../../services/despesa';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lista-despesas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lista-despesas.html',
  styleUrls: ['./lista-despesas.css']
})
export class ListaDespesasComponent implements OnInit {
  despesas: Despesa[] = [];
  mesAtual: Date = new Date();
  totalDespesas = 0;

  novaDespesa = {
    descricao: '',
    valor: 0,
    data: new Date().toISOString().split('T')[0],
    idContaFinanceira: '',
    idTipoDespesa: '',
    idNaturezaDespesa: '',
    idCategoriaEspecifica: ''
  };

  contas: any[] = [];
  totalPorConta: { descricao: string; valor: number }[] = [];
  tiposDespesa: Categoria[] = [];
  naturezaDespesa: Categoria[] = [];
  categoriasEspecificas: Categoria[] = [];


  constructor(private despesaService: DespesaService) { }

  ngOnInit(): void {
    this.carregarDespesas();
    this.carregarContas();
    this.calcularTotalPorConta();
  }

  carregarDespesas() {
    const mes = this.mesAtual.getMonth() + 1;
    const ano = this.mesAtual.getFullYear();
    this.despesaService.obterPorReferencia(mes, ano).subscribe({
      next: (dados: Despesa[]) => {
        this.despesas = dados;
        this.totalDespesas = dados.reduce((soma, d) => soma + d.valor, 0);
        this.calcularTotalPorConta();
      },
      error: (erro: any) => console.error('Erro ao carregar despesas', erro)
    });
  }

  carregarContas() {
    this.despesaService.listarContas().subscribe({
      next: (contas: any[]) => {
        this.contas = contas;
      },
      error: (erro: any) => console.error('Erro ao carregar contas', erro)
    });
  }

  calcularTotalPorConta() {
    const totalMap: { [id: string]: number } = {};

    this.despesas.forEach(despesa => {
      const idConta = despesa.idContaFinanceira;
      if (!totalMap[idConta]) {
        totalMap[idConta] = 0;
      }
      totalMap[idConta] += despesa.valor;
    });

    this.totalPorConta = Object.keys(totalMap).map(id => {
      const conta = this.contas.find(c => c.id === id);
      return {
        descricao: conta?.descricao || 'Conta Desconhecida',
        valor: totalMap[id]
      };
    });
  }

  carregarTiposDespesa() {
    this.despesaService.listarCategorias().subscribe({
      next: (categorias: Categoria[]) => {
        this.tiposDespesa = categorias.filter(c => c.categoriaPaiId === null && c.tipoTransacao === 1);
      },
      error: (erro: any) => console.error('Erro ao carregar tipos de despesa', erro)
    });
  }

  abrirModalEditar(despesa: Despesa) {
    this.novaDespesa = {
      descricao: despesa.descricao,
      valor: despesa.valor,
      data: despesa.data,
      idContaFinanceira: despesa.idContaFinanceira || '',
      idTipoDespesa: (despesa as any).idTipoDespesa || '',
      idNaturezaDespesa: (despesa as any).idNaturezaDespesa || '',
      idCategoriaEspecifica: (despesa as any).idCategoriaEspecifica || ''
    };

    this.carregarContas();
    this.carregarTiposDespesa();

    // Carregar natureza e categoria específica com base no idCategoria
    const categoriaId = despesa.idCategoria;
    if (categoriaId) {
      const categoria = this.despesaService.listarTodasCategorias.find(c => c.id === categoriaId);
      if (categoria && categoria.categoriaPaiId) {
        this.naturezaDespesa = this.despesaService.listarTodasCategorias.filter(c => c.categoriaPaiId === categoria.categoriaPaiId);
        if (this.naturezaDespesa.length > 0) {
          this.naturezaDespesa.forEach(n => {
            if (n.id === categoriaId) {
              this.novaDespesa.idNaturezaDespesa = n.id;
            }
          });
        }
      }
    }

    // Carregar categoria específica
    const naturezaId = this.novaDespesa.idNaturezaDespesa;
    if (naturezaId) {
      this.categoriasEspecificas = this.despesaService.listarTodasCategorias.filter(c => c.categoriaPaiId === naturezaId);
      if (this.categoriasEspecificas.length > 0) {
        this.categoriasEspecificas.forEach(cat => {
          if (cat.id === categoriaId) {
            this.novaDespesa.idCategoriaEspecifica = cat.id;
          }
        });
      }
    }

    Swal.fire({
      title: 'Editar Despesa',
      html: this.getModalHTML(),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => this.getFormData()
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.salvarEdicao(result.value);
      }
    });
  }

  getModalHTML(): string {
    return `
      <input id="descricao" class="swal2-input" placeholder="Descrição" value="${this.novaDespesa.descricao}">
      <input id="valor" type="number" step="0.01" class="swal2-input" placeholder="Valor" value="${this.novaDespesa.valor}">
      <input id="data" type="date" class="swal2-input" value="${this.novaDespesa.data}">

      <label class="swal2-label">Conta</label>
      <select id="conta" class="swal2-select">
        ${this.contas.map(c => `<option value="${c.id}" ${c.id === this.novaDespesa.idContaFinanceira ? 'selected' : ''}>${c.descricao}</option>`).join('')}
      </select>

      <label class="swal2-label">Tipo de Despesa</label>
      <select id="tipo" class="swal2-select">
        <option value="">Nenhum</option>
        ${this.tiposDespesa.map(t => `<option value="${t.id}" ${t.id === this.novaDespesa.idTipoDespesa ? 'selected' : ''}>${t.descricao}</option>`).join('')}
      </select>

      <label class="swal2-label">Natureza da Despesa</label>
      <select id="natureza" class="swal2-select">
        <option value="">Nenhum</option>
        ${this.naturezaDespesa.map(n => `<option value="${n.id}" ${n.id === this.novaDespesa.idNaturezaDespesa ? 'selected' : ''}>${n.descricao}</option>`).join('')}
      </select>

      <label class="swal2-label">Categoria Específica</label>
      <select id="categoria" class="swal2-select">
        <option value="">Nenhum</option>
        ${this.categoriasEspecificas.map(cat => `<option value="${cat.id}" ${cat.id === this.novaDespesa.idCategoriaEspecifica ? 'selected' : ''}>${cat.descricao}</option>`).join('')}
      </select>
    `;
  }

  getFormData() {
    return {
      descricao: (document.getElementById('descricao') as HTMLInputElement).value,
      valor: parseFloat((document.getElementById('valor') as HTMLInputElement).value),
      data: (document.getElementById('data') as HTMLInputElement).value,
      conta: (document.getElementById('conta') as HTMLSelectElement).value,
      tipo: (document.getElementById('tipo') as HTMLSelectElement).value,
      natureza: (document.getElementById('natureza') as HTMLSelectElement).value,
      categoria: (document.getElementById('categoria') as HTMLSelectElement).value
    };
  }

  salvarEdicao(formData: any) {
    // Find the original despesa being edited to get its id
    const despesaOriginal = this.despesas.find(d => d.descricao === this.novaDespesa.descricao && d.valor === this.novaDespesa.valor && d.data === this.novaDespesa.data);
    if (!despesaOriginal || !despesaOriginal.id) {
      Swal.fire('Erro!', 'Não foi possível identificar a despesa para atualizar.', 'error');
      return;
    }

    const payload = {
      id: despesaOriginal.id,
      descricao: formData.descricao,
      valor: Number(formData.valor),
      data: formData.data,
      idContaFinanceira: formData.conta,
      idCategoria: formData.categoria || formData.natureza || formData.tipo
    };

    this.despesaService.atualizarDespesa(payload).subscribe({
      next: (despesaAtualizada) => {
        const index = this.despesas.findIndex(d => d.id === despesaAtualizada.id);
        if (index !== -1) {
          this.despesas[index] = despesaAtualizada;
        }
        this.totalDespesas = this.despesas.reduce((soma, d) => soma + d.valor, 0);
        Swal.close();
        Swal.fire('sucesso!', 'Despesa atualizada com sucesso.', 'success');
      },
      error: (erro) => {
        console.error('Erro ao atualizar despesa', erro);
        Swal.fire('Erro!', 'Não foi possível atualizar a despesa.', 'error');
      }
    });
  }

  mudarMes(direcao: number) {
    this.mesAtual.setMonth(this.mesAtual.getMonth() + direcao);
    this.carregarDespesas();
  }
  deletarDespesa(id: string) {
    Swal.fire({
      title: 'Confirmação',
      text: 'Tem certeza que deseja deletar esta despesa?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, deletar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.despesaService.deletarDespesa(id).subscribe({
          next: () => {
            this.despesas = this.despesas.filter(d => d.id !== id);
            this.totalDespesas = this.despesas.reduce((soma, d) => soma + d.valor, 0);
            this.calcularTotalPorConta();
            Swal.fire('Deletado!', 'Despesa deletada com sucesso.', 'success');
          },
          error: (erro) => {
            console.error('Erro ao deletar despesa', erro);
            Swal.fire('Erro!', 'Não foi possível deletar a despesa.', 'error');
          }
        });
      }
    });
  }
}