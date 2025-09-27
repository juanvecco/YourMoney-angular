// import { Component } from "@angular/core";
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { ContaFinanceira } from '../../../services/conta';

// @Component({
//     selector: "app-gerenciar-contas",
//     standalone: true,
//     imports: [CommonModule, FormsModule],
//     templateUrl: "./gerenciar-contas.html"
// })
// export class GerenciarContasComponent {
//     novaConta = { descricao: '' };
//     contas: any[] = [];
//     totalContas = 0;
//     constructor(private contaService: ContaFinanceira) {
//         this.carregarDadosIniciais();
//     }

//     carregarDadosIniciais() {
//         this.carregarContas();
//     }
//     // listarContas() {
//     //     this.contaService.listarContas().subscribe({
//     //         next: (contas) => {
//     //             this.contas = contas;
//     //             this.totalContas = contas.length;
//     //             // Implementar lógica para exibir as contas
//     //         },
//     //         error: (erro) => {
//     //             console.error('Erro ao listar contas', erro);
//     //         }
//     //     });
//     // }

//     carregarContas() {
//         this.contaService.listarContas().subscribe({
//             next: (contas: any[]) => {
//                 this.contas = contas;
//             },
//             error: (erro: any) => console.error('Erro ao carregar contas', erro)
//         });
//     }


//     onSubmit() {
//         if (!this.novaConta.descricao.trim()) return;

//         this.contaService.criarConta(this.novaConta).subscribe({
//             next: () => {
//                 alert('Conta cadastrada com sucesso!');
//                 this.novaConta.descricao = '';
//             },
//             error: (erro) => {
//                 console.error('Erro ao cadastrar conta', erro);
//                 alert('Erro ao salvar conta.');
//             }
//         });
//     }
// }