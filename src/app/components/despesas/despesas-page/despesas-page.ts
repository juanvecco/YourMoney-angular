import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DespesaService, Despesa, Categoria } from '../../../services/despesa';
import Swal from 'sweetalert2';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-despesas-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './despesas-page.html',
    styleUrls: ['./despesas-page.scss']
})
export class DespesasComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();

    // === FORMULÁRIO ===
    novaDespesa = {
        id: '',
        descricao: '',
        valor: 0,
        data: new Date().toISOString().split('T')[0],
        idContaFinanceira: '',
        idTipoDespesa: '',
        idNaturezaDespesa: '',
        idCategoriaEspecifica: ''
    };

    editando = false;

    // === DADOS ===
    contas: any[] = [];
    tiposDespesa: Categoria[] = [];
    naturezasDespesa: Categoria[] = [];
    categoriasEspecificas: Categoria[] = [];

    despesas: Despesa[] = [];
    mesAtual: Date = new Date();
    totalDespesas = 0;
    totalPorConta: { descricao: string; valor: number }[] = [];

    // === TRILHA & GAMIFICAÇÃO ===
    mostrarDicaCategorizacao = false;
    dicaDespesaHover: Despesa | null = null;
    usuarioCategorizouEsteMes = false;
    badgeOrganizadorDesbloqueado = false;

    // === CALENDÁRIO ===
    @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

    constructor(private despesaService: DespesaService) { }

    ngOnInit() {
        this.carregarDadosIniciais();
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }

    // ==============================================================
    // CARREGAMENTO
    // ==============================================================

    carregarDadosIniciais() {
        this.carregarContas();
        this.carregarCategoriasCompletas();
        this.carregarDespesas();
    }

    carregarContas() {
        this.despesaService.listarContas()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (contas) => this.contas = contas,
                error: (erro) => console.error('Erro ao carregar contas', erro)
            });
    }

    carregarCategoriasCompletas() {
        this.despesaService.listarCategorias()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (categorias) => {
                    this.despesaService.setCategorias(categorias);
                    this.tiposDespesa = categorias.filter(c =>
                        c.categoriaPaiId === null && c.tipoTransacao === 1
                    );
                },
                error: (erro) => console.error('Erro ao carregar categorias', erro)
            });
    }

    carregarDespesas() {
        const mes = this.mesAtual.getMonth() + 1;
        const ano = this.mesAtual.getFullYear();

        this.despesaService.obterPorReferencia(mes, ano)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dados) => {
                    this.despesas = dados.sort((a, b) =>
                        new Date(b.data).getTime() - new Date(a.data).getTime()
                    );
                    this.totalDespesas = dados.reduce((soma, d) => soma + d.valor, 0);
                    this.calcularTotalPorConta();
                    this.verificarTrilhaOrganizador();
                },
                error: (erro) => console.error('Erro ao carregar despesas', erro)
            });
    }

    calcularTotalPorConta() {
        const totalMap: { [id: string]: number } = {};
        this.despesas.forEach(d => {
            totalMap[d.idContaFinanceira] = (totalMap[d.idContaFinanceira] || 0) + d.valor;
        });

        this.totalPorConta = Object.entries(totalMap).map(([id, valor]) => ({
            descricao: this.contas.find(c => c.id === id)?.descricao || 'Conta Desconhecida',
            valor
        }));
    }

    // ==============================================================
    // NAVEGAÇÃO
    // ==============================================================

    public mudarMes(direcao: number) {
        const novo = new Date(this.mesAtual);
        novo.setMonth(novo.getMonth() + direcao);
        this.mesAtual = novo;
        this.carregarDespesas();
    }

    public abrirCalendario() {
        const el = this.calendarioInput.nativeElement as HTMLInputElement & { showPicker?: () => void };
        if (typeof el.showPicker === 'function') {
            el.showPicker();
        } else {
            el.click();
        }
    }

    public selecionarMesDoCalendario(event: Event) {
        const input = event.target as HTMLInputElement;
        const [ano, mes] = input.value.split('-').map(Number);
        this.mesAtual = new Date(ano, mes - 1, 1);
        this.carregarDespesas();
    }

    // ==============================================================
    // MODAL
    // ==============================================================

    abrirModalDespesa() {
        this.editando = false;
        this.resetForm();
        this.abrirModal();
    }

    abrirModalEditar(despesa: Despesa) {
        this.editando = true;
        this.novaDespesa = {
            id: despesa.id,
            descricao: despesa.descricao,
            valor: despesa.valor,
            data: new Date(despesa.data).toISOString().split('T')[0],
            idContaFinanceira: despesa.idContaFinanceira || '',
            idTipoDespesa: '',
            idNaturezaDespesa: '',
            idCategoriaEspecifica: ''
        };
        this.carregarCascataCategoria(despesa.idCategoria);
        this.abrirModal();
    }

    private abrirModal() {
        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDespesa'));
        modal.show();
    }

    private resetForm() {
        this.novaDespesa = {
            id: '', descricao: '', valor: 0, data: new Date().toISOString().split('T')[0],
            idContaFinanceira: '', idTipoDespesa: '', idNaturezaDespesa: '', idCategoriaEspecifica: ''
        };
        this.naturezasDespesa = [];
        this.categoriasEspecificas = [];
    }

    // ==============================================================
    // CASCATA
    // ==============================================================

    private carregarCascataCategoria(idCategoria: string) {
        const todas = this.despesaService.todasCategorias;
        const cat = todas.find(c => c.id === idCategoria);
        if (!cat) return;

        if (!cat.categoriaPaiId) {
            this.novaDespesa.idTipoDespesa = cat.id;
            this.naturezasDespesa = todas.filter(c => c.categoriaPaiId === cat.id);
        } else {
            const pai = todas.find(c => c.id === cat.categoriaPaiId);
            if (pai && !pai.categoriaPaiId) {
                this.novaDespesa.idTipoDespesa = pai.id;
                this.novaDespesa.idNaturezaDespesa = cat.id;
                this.naturezasDespesa = todas.filter(c => c.categoriaPaiId === pai.id);
                this.categoriasEspecificas = todas.filter(c => c.categoriaPaiId === cat.id);
            } else {
                const avo = todas.find(c => c.id === pai?.categoriaPaiId);
                this.novaDespesa.idTipoDespesa = avo?.id || '';
                this.novaDespesa.idNaturezaDespesa = pai?.id || '';
                this.novaDespesa.idCategoriaEspecifica = cat.id;
                this.naturezasDespesa = todas.filter(c => c.categoriaPaiId === avo?.id);
                this.categoriasEspecificas = todas.filter(c => c.categoriaPaiId === pai?.id);
            }
        }
    }

    onTipoChange() {
        const tipoId = this.novaDespesa.idTipoDespesa;
        this.naturezasDespesa = tipoId
            ? this.despesaService.todasCategorias.filter(c => c.categoriaPaiId === tipoId)
            : [];
        this.novaDespesa.idNaturezaDespesa = '';
        this.novaDespesa.idCategoriaEspecifica = '';
        this.categoriasEspecificas = [];
    }

    onNaturezaChange() {
        const naturezaId = this.novaDespesa.idNaturezaDespesa;
        this.categoriasEspecificas = naturezaId
            ? this.despesaService.todasCategorias.filter(c => c.categoriaPaiId === naturezaId)
            : [];
        this.novaDespesa.idCategoriaEspecifica = '';
    }

    // ==============================================================
    // SALVAR
    // ==============================================================

    salvarDespesa() {
        if (!this.camposObrigatoriosPreenchidos()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const idCategoriaFinal = this.novaDespesa.idCategoriaEspecifica ||
            this.novaDespesa.idNaturezaDespesa ||
            this.novaDespesa.idTipoDespesa;

        const payload = {
            id: this.novaDespesa.id,
            descricao: this.novaDespesa.descricao,
            valor: this.novaDespesa.valor,
            data: this.novaDespesa.data,
            idContaFinanceira: this.novaDespesa.idContaFinanceira,
            idCategoria: idCategoriaFinal
        };

        const request$ = this.editando
            ? this.despesaService.atualizarDespesa(payload)
            : this.despesaService.criarDespesa(payload);

        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.fecharModal();
                this.carregarDespesas();
                this.mostrarSucesso();
                this.verificarBadgeOrganizador();
            },
            error: () => this.mostrarErro()
        });
    }

    private camposObrigatoriosPreenchidos(): boolean {
        return !!(
            this.novaDespesa.descricao &&
            this.novaDespesa.valor > 0 &&
            this.novaDespesa.data &&
            this.novaDespesa.idContaFinanceira &&
            this.novaDespesa.idTipoDespesa
        );
    }

    private mostrarAlertaCamposObrigatorios() {
        Swal.fire({ icon: 'warning', title: 'Campos obrigatórios!', text: 'Preencha todos os campos.', confirmButtonColor: '#d4af37' });
    }

    private mostrarSucesso() {
        Swal.fire({ icon: 'success', title: this.editando ? 'Atualizada!' : 'Cadastrada!', timer: 2000, showConfirmButton: false });
    }

    private mostrarErro() {
        Swal.fire({ icon: 'error', title: 'Erro!', text: 'Não foi possível salvar.', confirmButtonColor: '#dc3545' });
    }

    private fecharModal() {
        const modal = (window as any).bootstrap.Modal.getInstance(document.getElementById('modalDespesa'));
        modal?.hide();
    }

    deletarDespesa(id: string) {
        Swal.fire({
            title: 'Deletar?', text: 'Não pode ser desfeito.', icon: 'warning',
            showCancelButton: true, confirmButtonText: 'Sim', cancelButtonText: 'Não',
            confirmButtonColor: '#dc3545'
        }).then(result => {
            if (result.isConfirmed) {
                this.despesaService.deletarDespesa(id)
                    .pipe(takeUntil(this.destroy$))
                    .subscribe({
                        next: () => {
                            this.despesas = this.despesas.filter(d => d.id !== id);
                            this.totalDespesas = this.despesas.reduce((s, d) => s + d.valor, 0);
                            this.calcularTotalPorConta();
                            Swal.fire('Deletado!', '', 'success');
                        },
                        error: () => Swal.fire('Erro!', '', 'error')
                    });
            }
        });
    }

    // ==============================================================
    // TRILHA & GAMIFICAÇÃO
    // ==============================================================

    verificarTrilhaOrganizador() {
        const semCatEspecifica = this.despesas.filter(d =>
            !d.idCategoria || this.isCategoriaTipoOuNatureza(d.idCategoria)
        );
        this.usuarioCategorizouEsteMes = semCatEspecifica.length === 0 && this.despesas.length > 0;
        this.mostrarDicaCategorizacao = this.despesas.length > 3 && !this.usuarioCategorizouEsteMes;
    }

    private isCategoriaTipoOuNatureza(id: string): boolean {
        const cat = this.despesaService.todasCategorias.find(c => c.id === id);
        if (!cat) return true;
        if (!cat.categoriaPaiId) return true;
        const pai = this.despesaService.todasCategorias.find(c => c.id === cat.categoriaPaiId);
        return !pai?.categoriaPaiId;
    }

    verificarBadgeOrganizador() {
        if (this.despesas.length >= 10 && this.usuarioCategorizouEsteMes && !this.badgeOrganizadorDesbloqueado) {
            this.badgeOrganizadorDesbloqueado = true;
            this.celebrarBadge('Organizador Financeiro');
        }
    }

    private celebrarBadge(nome: string) {
        Swal.fire({
            icon: 'success', title: 'Conquista!', html: `<strong>${nome}</strong><br><small>10+ despesas categorizadas!</small>`,
            timer: 3000, showConfirmButton: false, background: '#fff8e1'
        });
    }

    // ==============================================================
    // HOVER
    // ==============================================================

    mostrarDicaHover(despesa: Despesa) {
        if (!despesa.idCategoria || this.isCategoriaTipoOuNatureza(despesa.idCategoria)) {
            this.dicaDespesaHover = despesa;
        }
    }

    esconderDicaHover() {
        this.dicaDespesaHover = null;
    }

    // ==============================================================
    // UTIL
    // ==============================================================

    obterNomeCategoria(id: string): string {
        return this.despesaService.todasCategorias.find(c => c.id === id)?.descricao || 'Sem categoria';
    }
}