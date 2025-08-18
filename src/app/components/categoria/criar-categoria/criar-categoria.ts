import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DespesaService, Categoria } from '../../../services/despesa';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-criar-categoria',
  standalone: true,
  templateUrl: './criar-categoria.html',
  styleUrls: ['./criar-categoria.css'],
  imports: [CommonModule, FormsModule],
})
export class CriarCategoriaComponent implements OnInit {
  novaCategoria = {
    descricao: '',
    tipoTransacao: 1,
    categoriaPaiId: '' as string | null // Pode ser string ou null
  };

  tiposDespesa: Categoria[] = [];
  naturezasDespesa: Categoria[] = [];

  constructor(private despesaService: DespesaService) { }

  ngOnInit(): void {
    this.carregarTiposDespesa();
  }

  carregarTiposDespesa() {
    this.despesaService.listarCategorias().subscribe({
      next: (categorias) => {
        this.tiposDespesa = categorias.filter(
          c => c.categoriaPaiId === null && c.tipoTransacao === 1
        );
      },
      error: (erro) => console.error('Erro ao carregar tipos de despesa', erro)
    });
  }

  onTipoChange() {
    const tipoId = this.novaCategoria.categoriaPaiId;
    if (!tipoId) {
      this.naturezasDespesa = [];
      return;
    }

    this.despesaService.listarCategorias().subscribe({
      next: (categorias) => {
        this.naturezasDespesa = categorias.filter(
          c => c.categoriaPaiId === tipoId
        );
      },
      error: (erro) => console.error('Erro ao carregar naturezas de despesa', erro)
    });
  }

  onSubmit() {
    if (!this.formValido()) return;

    let categoriaPaiId: string | null = null;

    categoriaPaiId = this.novaCategoria.categoriaPaiId || null;

    const payload = {
      descricao: this.novaCategoria.descricao,
      tipoTransacao: 1,
      categoriaPaiId: this.novaCategoria.categoriaPaiId
        ? this.novaCategoria.categoriaPaiId // se tem valor, usa
        : undefined // se vazio, usa `undefined`, NÃO `null`
    };

    this.despesaService.criarCategoria(payload).subscribe({
      next: () => {
        alert('Categoria cadastrada com sucesso!');
        this.resetarFormulario();
      },
      error: (erro) => {
        console.error('Erro ao salvar categoria', erro);
        alert('Erro ao salvar categoria.');
      }
    });
  }

  formValido(): boolean {
    return !!(
      this.novaCategoria.descricao &&
      this.novaCategoria.descricao.trim() !== ''
    );
  }

  resetarFormulario() {
    this.novaCategoria = {
      descricao: '',
      tipoTransacao: 1,
      categoriaPaiId: ''
    };
    this.naturezasDespesa = [];
  }
}