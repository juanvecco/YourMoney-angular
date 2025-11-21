import { Component, AfterViewInit, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ReceitaService, Receita } from '../../../services/receita';
import { DespesaService, Despesa } from '../../../services/despesa';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-dashboard-page',
    standalone: true,
    imports: [CommonModule, DecimalPipe],
    templateUrl: './dashboard-page.html',
    styleUrls: ['./dashboard-page.scss']
})
export class DashboardPageComponent implements AfterViewInit {
    // === DADOS DINÂMICOS ===
    receitas: Receita[] = [];
    despesas: Despesa[] = [];
    mesAtual = new Date();
    saldo = 0;
    progressoMeta = 89;

    // === RESUMO ===
    resumo = { receitas: 0, despesas: 0, sobrou: 0 };

    // === METAS E TAREFAS (mock ou service) ===
    metas = [
        { nome: 'Reserva de Emergência', atual: 4450, meta: 5000, progresso: 89, mensagem: 'Faltam apenas R$ 550!' },
        { nome: 'Viagem para Europa', atual: 1200, meta: 8000, progresso: 15, mensagem: 'Você está no caminho certo!' }
    ];

    tarefas = [
        { descricao: 'Revisar gastos com alimentação', cor: 'var(--laranja-atencao)' },
        { descricao: 'Atualizar meta de reserva', cor: 'var(--blue)' },
        { descricao: 'Considerar novo investimento', cor: 'var(--green)' }
    ];

    // Dados do usuário (mock - use AuthService)
    userData = {
        isFirstTime: false,
        completedSteps: ['first_login', 'add_income', 'add_expense', 'categorize'],
        currentStep: 'create_goal'
    };

    constructor(
        private router: Router,
        private renderer: Renderer2,
        private receitaService: ReceitaService,
        private despesaService: DespesaService
    ) { }

    ngOnInit(): void {
        this.carregarDadosMesAtual();
    }

    ngAfterViewInit() {
        this.initAnimations();
        this.loadDashboardData();
        this.setupEasterEgg();
    }

    navegarPara(rota: string) {
        this.router.navigate([rota]);
    }

    carregarDadosMesAtual() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();

        this.receitaService.obterPorReferencia(mes, ano).subscribe(receitas => {
            this.receitas = receitas;
            this.atualizarSaldo();
        });

        this.despesaService.obterPorReferencia(mes, ano).subscribe(despesas => {
            this.despesas = despesas;
            this.atualizarSaldo();
        });
    }

    atualizarSaldo() {
        const totalReceitas = this.receitas.reduce((soma, r) => soma + r.valor, 0);
        const totalDespesas = this.despesas.reduce((soma, d) => soma + d.valor, 0);
        this.saldo = totalReceitas - totalDespesas;

        this.resumo = {
            receitas: totalReceitas,
            despesas: totalDespesas,
            sobrou: this.saldo
        };
    }

    adicionarReceita() {
        this.showToast('Redirecionando para adicionar receita...');
        this.router.navigate(['/receitas']);
    }

    adicionarDespesa() {
        this.showToast('Redirecionando para registrar despesa...');
        this.router.navigate(['/despesas']);
    }

    verInvestimentos() {
        this.showToast('Explorando oportunidades de investimento...');
        this.router.navigate(['/investimentos']);
    }

    criarMeta() {
        this.showToast('Vamos definir uma nova meta financeira!');
        this.router.navigate(['/metas/nova']);
    }

    verTodasMetas() {
        this.showToast('Carregando suas metas...');
        this.router.navigate(['/metas']);
    }

    verRelatorio() {
        this.showToast('Gerando relatório detalhado...');
        this.router.navigate(['/relatorios']);
    }

    descobrirInvestimentos() {
        this.showToast('Ótima decisão! Vamos explorar investimentos juntos.');
        this.router.navigate(['/investimentos/descobrir']);
    }

    private initLearningPath() {
        if (this.userData.isFirstTime) {
            this.showWelcomeModal();
        } else if (this.userData.currentStep === 'create_goal') {
            setTimeout(() => this.highlightGoalCreation(), 3000);
        }
    }

    private highlightGoalCreation() {
        const goalCard = document.querySelector('.sidebar-section .card-custom');
        if (goalCard) {
            this.renderer.setStyle(goalCard, 'border', '2px solid var(--yellow)');
            this.renderer.setStyle(goalCard, 'animation', 'pulse 2s ease-in-out 3');

            setTimeout(() => {
                this.renderer.removeStyle(goalCard, 'border');
                this.renderer.removeStyle(goalCard, 'animation');
            }, 6000);
        }
    }

    private initAnimations() {
        const elements = document.querySelectorAll('.fade-in-up');
        elements.forEach((element: Element, index: number) => {
            this.renderer.setStyle(element, 'animationDelay', `${index * 0.1}s`);
        });
    }

    private loadDashboardData() {
        // Simula carregamento (conecte a API real)
        setTimeout(() => {
            console.log('Dados do dashboard carregados');
            this.initLearningPath();
        }, 1000);
    }

    private setupEasterEgg() {
        let clickCount = 0;
        const navbarBrand = document.querySelector('.navbar-brand-custom');
        if (navbarBrand) {
            navbarBrand.addEventListener('click', () => {
                clickCount++;
                if (clickCount === 3) {
                    this.showToast('🎉 Você descobriu um easter egg! Parabéns pela curiosidade!');
                    clickCount = 0;
                }
                setTimeout(() => clickCount = 0, 2000);
            });
        }
    }

    private showToast(message: string) {
        const toastMessageEl = document.getElementById('toastMessage');
        if (toastMessageEl) toastMessageEl.textContent = message;
        const toastEl = document.getElementById('successToast');
        if (toastEl) {
            const toast = new (window as any).bootstrap.Toast(toastEl);
            toast.show();
        }
    }

    private showWelcomeModal() {
        // Implemente um modal de boas-vindas (use NgBootstrap ou vanilla)
        Swal.fire({
            title: 'Bem-vindo ao Your Money 2.0!',
            text: 'Vamos começar sua jornada financeira.',
            icon: 'success'
        });
    }
}