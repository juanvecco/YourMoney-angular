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
        id: '',
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

    editando: boolean = false;

    abrirModalEditar(despesa: Despesa) {
        this.editando = true;
        this.novaDespesa = {
            id: despesa.id,
            descricao: despesa.descricao,
            valor: despesa.valor,
            data: new Date(despesa.data).toISOString().split('T')[0],
            idContaFinanceira: despesa.idContaFinanceira || '',
            idTipoDespesa: '',
            idNaturezaDespesa: '',
            idCategoriaEspecifica: ''
        };

        const categoria = this.despesaService.listarTodasCategorias.find(c => c.id === despesa.idCategoria);

        if (categoria) {
            if (!categoria.categoriaPaiId) {
                // categoria é um Tipo
                this.novaDespesa.idTipoDespesa = categoria.id;
                this.naturezasDespesa = this.despesaService.listarTodasCategorias.filter(c => c.categoriaPaiId === categoria.id);
            } else {
                const pai = this.despesaService.listarTodasCategorias.find(c => c.id === categoria.categoriaPaiId);
                if (pai) {
                    if (!pai.categoriaPaiId) {
                        // categoria é Natureza
                        this.novaDespesa.idTipoDespesa = pai.id;
                        this.novaDespesa.idNaturezaDespesa = categoria.id;
                        this.naturezasDespesa = this.despesaService.listarTodasCategorias.filter(c => c.categoriaPaiId === pai.id);
                        this.categoriasEspecificas = this.despesaService.listarTodasCategorias.filter(c => c.categoriaPaiId === categoria.id);
                    } else {
                        // categoria é Específica
                        const avo = this.despesaService.listarTodasCategorias.find(c => c.id === pai.categoriaPaiId);
                        this.novaDespesa.idTipoDespesa = avo?.id || '';
                        this.novaDespesa.idNaturezaDespesa = pai.id;
                        this.novaDespesa.idCategoriaEspecifica = categoria.id;

                        this.naturezasDespesa = this.despesaService.listarTodasCategorias.filter(c => c.categoriaPaiId === avo?.id);
                        this.categoriasEspecificas = this.despesaService.listarTodasCategorias.filter(c => c.categoriaPaiId === pai.id);
                    }
                }
            }
        }

        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDespesa'));
        modal.show();
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

    abrirModalDespesa() {
        this.editando = false;
        this.novaDespesa = {
            id: '',
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
        if (!this.novaDespesa.descricao || !this.novaDespesa.valor || !this.novaDespesa.data || !this.novaDespesa.idContaFinanceira || !this.novaDespesa.idTipoDespesa) {
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

        const payload = {
            id: this.novaDespesa.id,
            descricao: this.novaDespesa.descricao,
            valor: this.novaDespesa.valor,
            data: this.novaDespesa.data,
            idContaFinanceira: this.novaDespesa.idContaFinanceira,
            idCategoria: this.novaDespesa.idCategoriaEspecifica ||
                this.novaDespesa.idNaturezaDespesa ||
                this.novaDespesa.idTipoDespesa
        };

        const request$ = this.editando
            ? this.despesaService.atualizarDespesa(payload)
            : this.despesaService.criarDespesa({
                descricao: this.novaDespesa.descricao,
                valor: this.novaDespesa.valor,
                data: this.novaDespesa.data,
                idContaFinanceira: this.novaDespesa.idContaFinanceira,
                idCategoria: this.novaDespesa.idCategoriaEspecifica ||
                    this.novaDespesa.idNaturezaDespesa ||
                    this.novaDespesa.idTipoDespesa
            });

        request$.subscribe({
            next: () => {
                const modal = document.querySelector('#modalDespesa');
                (window as any).bootstrap.Modal.getInstance(modal)?.hide();
                this.carregarDespesas();

                // ✅ Alerta mais elegante
                Swal.fire({
                    icon: 'success',
                    title: this.editando ? 'Despesa atualizada!' : 'Despesa cadastrada!',
                    text: this.editando
                        ? 'Sua despesa foi atualizada com sucesso.'
                        : 'Sua despesa foi registrada com sucesso.',
                    confirmButtonColor: '#b49452',
                    background: '#f8f8f8',
                    color: '#283b6b',
                });
            },
            error: (erro) => {
                console.error('Erro ao salvar despesa', erro);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro!',
                    text: this.editando
                        ? 'Não foi possível atualizar a despesa.'
                        : 'Não foi possível salvar a despesa.',
                    confirmButtonColor: '#b49452',
                    background: '#f8f8f8',
                    color: '#283b6b',
                });
            }
        });
    }
}