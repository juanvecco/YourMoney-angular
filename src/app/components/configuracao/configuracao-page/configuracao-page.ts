import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CriarCategoriaComponent } from '../../categoria/criar-categoria/criar-categoria';

@Component({
    selector: "app-configuracao-page",
    standalone: true,
    imports: [CommonModule, FormsModule, CriarCategoriaComponent],
    templateUrl: "./configuracao-page.html"
})
export class ConfiguracaoPageComponent {
    mostrarModalCategoria = false;

    abrirModalCategoria() {
        this.mostrarModalCategoria = true;
    }

    fecharModalCategoria() {
        this.mostrarModalCategoria = false;
    }

    salvarCategoria(categoria: any) {
        console.log('Categoria salva', categoria);
        this.fecharModalCategoria();
        // aqui você chama o service para salvar no backend
    }
}