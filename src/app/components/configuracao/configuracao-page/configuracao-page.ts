import { Component, OnInit } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CriarCategoriaComponent } from '../../categoria/criar-categoria/criar-categoria';
import { Categoria } from '../../../models/despesa.model';
import { CategoriaPayload, CategoriaService } from '../../../services/categoria';

@Component({
    selector: "app-configuracao-page",
    standalone: true,
    imports: [CommonModule, FormsModule, CriarCategoriaComponent],
    templateUrl: "./configuracao-page.html"
})
export class ConfiguracaoPageComponent implements OnInit {
    private readonly tipoTransacaoDespesa = 1;

    categorias: Categoria[] = [];
    categoriasEspecificas: Categoria[] = [];
    mostrarModalCategoria = false;
    categoriaEmEdicao: Categoria | null = null;
    carregandoCategorias = false;
    mensagemErro = '';
    mensagemSucesso = '';

    constructor(private categoriaService: CategoriaService) { }

    ngOnInit() {
        this.carregarCategorias();
    }

    carregarCategorias() {
        this.carregandoCategorias = true;
        this.mensagemErro = '';

        this.categoriaService.listarCategorias().subscribe({
            next: categorias => {
                this.categorias = categorias;
                this.categoriasEspecificas = this.obterCategoriasEspecificas(categorias);
                this.carregandoCategorias = false;
            },
            error: () => {
                this.mensagemErro = 'Não foi possível carregar as categorias.';
                this.carregandoCategorias = false;
            }
        });
    }

    abrirModalCategoria() {
        this.categoriaEmEdicao = null;
        this.mostrarModalCategoria = true;
    }

    editarCategoria(categoria: Categoria) {
        this.categoriaEmEdicao = { ...categoria };
        this.mostrarModalCategoria = true;
    }

    fecharModalCategoria() {
        this.mostrarModalCategoria = false;
        this.categoriaEmEdicao = null;
    }

    salvarCategoria(evento: { id?: string; payload: CategoriaPayload }) {
        this.mensagemErro = '';
        this.mensagemSucesso = '';

        const requisicao = evento.id
            ? this.categoriaService.atualizarCategoria(evento.id, evento.payload)
            : this.categoriaService.criarCategoria(evento.payload);

        requisicao.subscribe({
            next: () => {
                this.mensagemSucesso = evento.id ? 'Categoria atualizada.' : 'Categoria cadastrada.';
                this.fecharModalCategoria();
                this.carregarCategorias();
            },
            error: () => {
                this.mensagemErro = 'Não foi possível salvar a categoria.';
            }
        });
    }

    removerCategoria(categoria: Categoria) {
        const confirmar = window.confirm(`Remover a categoria "${categoria.descricao}"?`);

        if (!confirmar) {
            return;
        }

        this.mensagemErro = '';
        this.mensagemSucesso = '';

        this.categoriaService.removerCategoria(categoria.id).subscribe({
            next: () => {
                this.mensagemSucesso = 'Categoria removida.';
                this.carregarCategorias();
            },
            error: () => {
                this.mensagemErro = 'Não foi possível remover a categoria.';
            }
        });
    }

    obterCaminhoCategoria(categoria: Categoria): string {
        const natureza = this.categorias.find(c => c.id === categoria.categoriaPaiId);
        const tipo = this.categorias.find(c => c.id === natureza?.categoriaPaiId);
        return [tipo?.descricao, natureza?.descricao].filter(Boolean).join(' / ');
    }

    private obterCategoriasEspecificas(categorias: Categoria[]): Categoria[] {
        return categorias
            .filter(categoria => {
                const natureza = categorias.find(c => c.id === categoria.categoriaPaiId);
                const tipo = categorias.find(c => c.id === natureza?.categoriaPaiId);

                return categoria.tipoTransacao === this.tipoTransacaoDespesa
                    && !!natureza
                    && !!tipo
                    && !tipo.categoriaPaiId;
            })
            .sort((a, b) => a.descricao.localeCompare(b.descricao));
    }
}
