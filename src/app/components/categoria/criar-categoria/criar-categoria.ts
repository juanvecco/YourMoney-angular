import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Categoria } from '../../../models/despesa.model';
import { CategoriaPayload } from '../../../services/categoria';

@Component({
  selector: 'app-criar-categoria',
  standalone: true,
  imports: [CommonModule, FormsModule, NgFor],
  templateUrl: './criar-categoria.html',
  styleUrl: './criar-categoria.css'
})
export class CriarCategoriaComponent implements OnInit, OnChanges {
  @Input() categoria: Categoria | null = null;
  @Input() categorias: Categoria[] = [];
  @Input() editando = false;

  @Output() salvar = new EventEmitter<{ id?: string; payload: CategoriaPayload }>();
  @Output() fechar = new EventEmitter<void>();

  private readonly tipoTransacaoDespesa = 1;

  descricao = '';
  tipoId = '';
  naturezaId = '';
  tiposDespesa: Categoria[] = [];
  naturezasDespesa: Categoria[] = [];

  ngOnInit() {
    this.prepararFormulario();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categoria'] || changes['categorias']) {
      this.prepararFormulario();
    }
  }

  prepararFormulario() {
    this.tiposDespesa = this.categorias.filter(c => !c.categoriaPaiId && c.tipoTransacao === this.tipoTransacaoDespesa);
    this.descricao = this.categoria?.descricao ?? '';

    if (this.categoria?.categoriaPaiId) {
      const natureza = this.categorias.find(c => c.id === this.categoria?.categoriaPaiId);
      this.naturezaId = natureza?.id ?? '';
      this.tipoId = natureza?.categoriaPaiId ?? '';
    } else {
      this.tipoId = this.tiposDespesa[0]?.id ?? '';
      this.naturezaId = '';
    }

    this.atualizarNaturezas(false);
  }

  atualizarNaturezas(limparNatureza = true) {
    this.naturezasDespesa = this.categorias.filter(c => c.categoriaPaiId === this.tipoId);

    if (limparNatureza || !this.naturezasDespesa.some(c => c.id === this.naturezaId)) {
      this.naturezaId = this.naturezasDespesa[0]?.id ?? '';
    }
  }

  salvarCategoria() {
    const descricao = this.descricao.trim();

    if (!descricao || !this.naturezaId) {
      return;
    }

    this.salvar.emit({
      id: this.categoria?.id,
      payload: {
        descricao,
        tipoTransacao: this.tipoTransacaoDespesa,
        categoriaPaiId: this.naturezaId
      }
    });
  }

  fecharModal() {
    this.fechar.emit();
  }
}
