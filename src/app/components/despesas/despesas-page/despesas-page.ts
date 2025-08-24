import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DespesaService, Despesa, Categoria } from '../../../services/despesa';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-despesas-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './despesas-page.html'
})
export class DespesasPageComponent {
    //Formulário
    novaDespesa = {
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        idContaFinanceira: '',
        idTipoDespesa: '',
        idNaturezaDespesa: '',
        idCategoriaEspecifica: ''
    };

    //Dados
    contas: any[] = [];
    tiposDespesa: any[] = [];
    naturezasDespesa: any[] = [];
    categoriasEspecificas: any[] = [];

    // Lista de despesas
    despesas: Despesa[] = [];
    mesAtual: Date = new Date();
    totalDespesas = 0;

    // Editar
    totalPorConta: { descricao: string; valor: number }[] = [];
    tiposDespesaCategoria: Categoria[] = [];
    naturezaDespesaCategoria: Categoria[] = [];
    categoriasEspecificasCategoria: Categoria[] = [];

    constructor(private despesaService: DespesaService) {
        this.carregarDadosIniciais();
    }

    carregarDadosIniciais() {
        this.carregarContas();
        this.carregarTiposDespesa();
        this.carregarDespesas();
        this.calcularTotalPorConta();
    }

    carregarContas() {
        this.despesaService.listarContas().subscribe({
            next: (contas) => this.contas = contas,
            error: (erro) => console.error('Erro ao carregar contas', erro)
        });
    }

    carregarTiposDespesa() {
        this.despesaService.listarCategorias().subscribe({
            next: (categorias) => {
                this.tiposDespesa = categorias.filter(c => c.categoriaPaiId === null && c.tipoTransacao === 1);
            },
            error: (erro) => console.error('Erro ao carregar tipos de despesa', erro)
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

    carregarDespesas() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.despesaService.obterPorReferencia(mes, ano).subscribe({
            next: (dados) => {
                this.despesas = dados.sort((a, b) => {
                    return new Date(b.data).getTime() - new Date(a.data).getTime();
                });
                this.totalDespesas = dados.reduce((soma, d) => soma + d.valor, 0);
                this.calcularTotalPorConta();
            },
            error: (erro) => console.error('Erro ao carregar despesas', erro)
        });
    }

    mudarMes(direcao: number) {
        const novoMes = new Date(this.mesAtual);
        novoMes.setMonth(novoMes.getMonth() + direcao);
        this.mesAtual = novoMes;
        this.carregarDespesas();
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
                this.naturezaDespesaCategoria = this.despesaService.listarTodasCategorias.filter(c => c.categoriaPaiId === categoria.categoriaPaiId);
                if (this.naturezaDespesaCategoria.length > 0) {
                    this.naturezaDespesaCategoria.forEach(n => {
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
              ${this.naturezaDespesaCategoria.map(n => `<option value="${n.id}" ${n.id === this.novaDespesa.idNaturezaDespesa ? 'selected' : ''}>${n.descricao}</option>`).join('')}
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
    // --- Lógica do Modal ---

    onTipoChange() {
        const tipoId = this.novaDespesa.idTipoDespesa;
        if (!tipoId) {
            this.naturezasDespesa = [];
            this.categoriasEspecificas = [];
            this.novaDespesa.idNaturezaDespesa = '';
            this.novaDespesa.idCategoriaEspecifica = '';
            return;
        }

        this.naturezasDespesa = this.despesaService.listarTodasCategorias
            .filter(c => c.categoriaPaiId === tipoId);

        this.novaDespesa.idNaturezaDespesa = '';
        this.novaDespesa.idCategoriaEspecifica = '';
        this.categoriasEspecificas = [];
    }

    onNaturezaChange() {
        const naturezaId = this.novaDespesa.idNaturezaDespesa;
        if (!naturezaId) {
            this.categoriasEspecificas = [];
            this.novaDespesa.idCategoriaEspecifica = '';
            return;
        }

        this.categoriasEspecificas = this.despesaService.listarTodasCategorias
            .filter(c => c.categoriaPaiId === naturezaId);

        this.novaDespesa.idCategoriaEspecifica = '';
    }

    abrirModal() {
        this.novaDespesa = {
            descricao: '',
            valor: 0,
            data: new Date().toISOString().split('T')[0],
            idContaFinanceira: '',
            idTipoDespesa: '',
            idNaturezaDespesa: '',
            idCategoriaEspecifica: ''
        };
        this.naturezasDespesa = [];
        this.categoriasEspecificas = [];

        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDespesa'));
        modal.show();
    }

    salvarDespesa() {
        const idCategoriaFinal = this.novaDespesa.idCategoriaEspecifica ||
            this.novaDespesa.idNaturezaDespesa ||
            this.novaDespesa.idTipoDespesa;

        if (!this.novaDespesa.descricao || !this.novaDespesa.idContaFinanceira || !idCategoriaFinal) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        const payload = {
            descricao: this.novaDespesa.descricao,
            valor: Number(this.novaDespesa.valor),
            data: this.novaDespesa.data,
            idContaFinanceira: this.novaDespesa.idContaFinanceira,
            idCategoria: idCategoriaFinal
        };

        this.despesaService.criarDespesa(payload).subscribe({
            next: () => {
                alert('Despesa cadastrada com sucesso!');
                const modal = document.querySelector('#modalDespesa');
                (window as any).bootstrap.Modal.getInstance(modal)?.hide();
                this.carregarDespesas();
            },
            error: (erro) => {
                console.error('Erro ao salvar despesa', erro);
                alert('Erro ao salvar despesa. Verifique o console.');
            }
        });
    }
}