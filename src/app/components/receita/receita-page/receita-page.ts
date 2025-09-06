import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Receita, ReceitaService } from "../../../services/receita";
import Swal from 'sweetalert2';

@Component({
    selector: "app-receita-page",
    imports: [CommonModule, FormsModule],
    templateUrl: "./receita-page.html"
})
export class ReceitaPageComponent {
    // Lógica do componente
    receitas: Receita[] = [];
    mesAtual: Date = new Date();
    totalReceitas = 0;

    //Formulário
    novaReceita = {
        id: '',
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0]
    };

    constructor(private receitaService: ReceitaService) {
        this.carregarDadosIniciais();
    }
    carregarDadosIniciais() {
        this.carregarReceitas();
    }

    carregarReceitas() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();
        this.receitaService.obterPorReferencia(mes, ano).subscribe({
            next: (dados) => {
                this.receitas = dados.sort((a, b) => {
                    return new Date(b.data).getTime() - new Date(a.data).getTime();
                });
                this.totalReceitas = dados.reduce((soma, d) => soma + d.valor, 0);
            },
            error: (erro) => console.error('Erro ao carregar receitas', erro)
        });
    }

    mudarMes(direcao: number) {
        const novoMes = new Date(this.mesAtual);
        novoMes.setMonth(novoMes.getMonth() + direcao);
        this.mesAtual = novoMes;
        this.carregarReceitas();
    }

    editando: boolean = false;

    abrirModalReceita() {
        this.editando = false;
        this.novaReceita = {
            id: '',
            descricao: '',
            valor: 0,
            data: new Date().toISOString().split('T')[0]
        };
        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalReceita'));
        modal.show();
    }

    abrirModalEditar(receita: Receita) {
        this.editando = true;
        this.novaReceita = { ...receita, data: new Date(receita.data).toISOString().split('T')[0] };
        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalReceita'));
        modal.show();
    }

    salvarReceita() {
        if (!this.novaReceita.descricao || !this.novaReceita.valor || !this.novaReceita.data) {
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
            ? this.receitaService.atualizarReceita(this.novaReceita)
            : this.receitaService.criarReceita(this.novaReceita);

        request$.subscribe({
            next: () => {
                const modal = document.getElementById('modalReceita');
                (window as any).bootstrap.Modal.getInstance(modal)?.hide();
                this.carregarReceitas();

                Swal.fire({
                    icon: 'success',
                    title: this.editando ? 'Receita atualizada!' : 'Receita cadastrada!',
                    text: this.editando
                        ? 'Sua receita foi atualizada com sucesso.'
                        : 'Sua receita foi registrada com sucesso.',
                    confirmButtonColor: '#b49452',
                    background: '#f8f8f8',
                    color: '#283b6b',
                });
            },
            error: (erro) => {
                console.error('Erro ao salvar receita', erro);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro!',
                    text: this.editando
                        ? 'Não foi possível atualizar a receita.'
                        : 'Não foi possível salvar a receita.',
                    confirmButtonColor: '#b49452',
                    background: '#f8f8f8',
                    color: '#283b6b',
                });
            }
        });
    }

    deletarReceita(id: string) {
        Swal.fire({
            title: 'Confirmação',
            text: 'Tem certeza que deseja deletar esta receita?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, deletar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.receitaService.deletarReceita(id).subscribe({
                    next: () => {
                        this.receitas = this.receitas.filter(d => d.id !== id);
                        this.totalReceitas = this.receitas.reduce((soma, d) => soma + d.valor, 0);
                        Swal.fire('Deletado!', 'Receita deletada com sucesso.', 'success');
                    },
                    error: (erro) => {
                        console.error('Erro ao deletar receita', erro);
                        Swal.fire('Erro!', 'Não foi possível deletar a receita.', 'error');
                    }
                });
            }
        });
    }

}
