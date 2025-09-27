import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriaService } from '../../../services/categoria';
import { CriarCategoriaComponent } from '../criar-categoria/criar-categoria';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-categorias-page',
    standalone: true,
    imports: [CommonModule, FormsModule, CriarCategoriaComponent],
    templateUrl: './categorias-page.html'
})
export class CategoriasPageComponent {
    categorias: any[] = [];

    mostrarModalCategoria = false;
    categoriaSelecionada: any = null;
    editando = false;

    constructor(private categoriaService: CategoriaService) {
        this.carregarCategorias();
    }

    carregarCategorias() {
        this.categoriaService.listarCategorias().subscribe({
            next: (dados) => (this.categorias = dados),
            error: (erro) => console.error('Erro ao carregar categorias', erro)
        });
    }

    abrirModalCategoria(categoria: any = null) {
        this.editando = !!categoria;
        this.categoriaSelecionada = categoria
            ? { ...categoria }
            : { id: '', nome: '', categoriaPaiId: null };

        this.mostrarModalCategoria = true;
    }

    fecharModal() {
        this.mostrarModalCategoria = false;
    }

    salvarCategoria(categoria: any) {
        const request$ = this.editando
            ? this.categoriaService.atualizarCategoria(categoria)
            : this.categoriaService.criarCategoria(categoria);

        request$.subscribe({
            next: () => {
                this.fecharModal();
                this.carregarCategorias();
                Swal.fire({
                    icon: 'success',
                    title: this.editando ? 'Categoria atualizada!' : 'Categoria criada!',
                    confirmButtonColor: '#28a745'
                });
            },
            error: () => {
                Swal.fire('Erro', 'Não foi possível salvar a categoria', 'error');
            }
        });
    }
}
