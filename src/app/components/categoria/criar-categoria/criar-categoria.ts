import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-criar-categoria',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, NgFor],
  templateUrl: './criar-categoria.html'
})
export class CriarCategoriaComponent implements OnInit {
  @Input() categoria: any = { id: '', nome: '', categoriaPaiId: null };
  @Input() categorias: any[] = [];
  @Input() editando = false;

  @Output() salvar = new EventEmitter<any>();
  @Output() fechar = new EventEmitter<void>();

  categoriaTipo: 'tipo' | 'natureza' | 'especifica' = 'tipo';
  tiposDespesa: any[] = [];
  naturezasDespesa: any[] = [];

  ngOnInit() {
    this.prepararListas();
  }

  prepararListas() {
    this.tiposDespesa = this.categorias.filter(c => !c.categoriaPaiId);
    this.naturezasDespesa = this.categorias.filter(c =>
      this.tiposDespesa.some(t => t.id === c.categoriaPaiId)
    );
  }

  salvarCategoria() {
    if (!this.categoria.nome) return;
    this.salvar.emit({ ...this.categoria, categoriaTipo: this.categoriaTipo });
  }

  fecharModal() {
    this.fechar.emit();
  }
}
