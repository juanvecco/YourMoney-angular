import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { Receita, ReceitaService } from "../../../services/receita";

@Component({
    selector: "app-receita-page",
    imports: [CommonModule],
    templateUrl: "./receita-page.html"
})
export class ReceitaPageComponent {
    // Lógica do componente

    receitas: Receita[] = [];
    mesAtual: Date = new Date();
    totalReceitas = 0;


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
}
