import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DespesaService, Despesa, Categoria, CriarParcelamentoRequest, ParcelaPreview } from '../../../services/despesa';
import Swal from 'sweetalert2';
import { forkJoin, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { FinancialViewState, financialStateMessage } from '../../../models/financial-view-state.model';

type DespesaLote = {
    descricao: string;
    valor: number;
    data: string;
    mesReferencia: string;
    idContaFinanceira: string;
    idCategoria: string;
    contaDescricao: string;
    categoriaDescricao: string;
};

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
        mesReferencia: this.obterMesReferenciaInput(new Date()),
        idContaFinanceira: '',
        idTipoDespesa: '',
        idNaturezaDespesa: '',
        idCategoriaEspecifica: ''
    };

    editando = false;
    despesasEmLote: DespesaLote[] = [];
    parcelamentoAtivo = false;
    quantidadeParcelas = 1;
    parcelasPreview: ParcelaPreview[] = [];
    salvandoDespesa = false;
    salvandoParcelamento = false;

    // === DADOS ===
    contas: any[] = [];
    tiposDespesa: Categoria[] = [];
    naturezasDespesa: Categoria[] = [];
    categoriasEspecificas: Categoria[] = [];

    despesas: Despesa[] = [];
    mesAtual: Date = new Date();
    totalDespesas = 0;
    totalPorConta: { descricao: string; valor: number }[] = [];
    estadoCarregamento: FinancialViewState = 'loading';
    mensagemCarregamento = '';

    // === TRILHA & GAMIFICAÇÃO ===
    mostrarDicaCategorizacao = false;
    dicaDespesaHover: Despesa | null = null;
    usuarioCategorizouEsteMes = false;
    badgeOrganizadorDesbloqueado = false;

    // === CALENDÁRIO ===
    @ViewChild('calendarioInput') calendarioInput!: ElementRef<HTMLInputElement>;

    constructor(
        private despesaService: DespesaService,
        private authService: AuthService,
        private router: Router
    ) { }

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
        this.despesas = [];
        this.totalDespesas = 0;
        this.totalPorConta = [];
        this.estadoCarregamento = 'loading';
        this.atualizarMensagemCarregamento();

        this.despesaService.obterPorReferencia(mes, ano)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dados) => {
                    this.despesas = dados.sort((a, b) =>
                        new Date(b.data).getTime() - new Date(a.data).getTime()
                    );
                    this.totalDespesas = dados.reduce((soma, d) => soma + d.valor, 0);
                    this.calcularTotalPorConta();
                    this.estadoCarregamento = this.despesas.length > 0 ? 'loadedWithData' : 'emptyPeriod';
                    this.atualizarMensagemCarregamento();
                    this.verificarTrilhaOrganizador();
                },
                error: (erro) => {
                    console.error('Erro ao carregar despesas', erro);
                    this.despesas = [];
                    this.totalDespesas = 0;
                    this.totalPorConta = [];
                    this.estadoCarregamento = 'loadError';
                    this.atualizarMensagemCarregamento();
                }
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

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }

    // ==============================================================
    // MODAL
    // ==============================================================

    abrirModalDespesa() {
        this.editando = false;
        this.limparLote();
        this.resetForm();
        this.resetParcelamento();
        this.abrirModal();
    }

    abrirModalEditar(despesa: Despesa) {
        this.editando = true;
        this.resetParcelamento();
        this.novaDespesa = {
            id: despesa.id,
            descricao: despesa.descricao,
            valor: despesa.valor,
            data: new Date(despesa.data).toISOString().split('T')[0],
            mesReferencia: this.obterMesReferenciaInput(despesa.mesReferencia || despesa.data),
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
            mesReferencia: this.obterMesReferenciaInput(this.mesAtual),
            idContaFinanceira: '', idTipoDespesa: '', idNaturezaDespesa: '', idCategoriaEspecifica: ''
        };
        this.naturezasDespesa = [];
        this.categoriasEspecificas = [];
        this.resetParcelamento();
    }

    private resetParcelamento() {
        this.parcelamentoAtivo = false;
        this.quantidadeParcelas = 1;
        this.parcelasPreview = [];
        this.salvandoDespesa = false;
        this.salvandoParcelamento = false;
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
        if (this.salvandoDespesa || this.salvandoParcelamento) {
            return;
        }

        if (!this.camposObrigatoriosPreenchidos()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        if (!this.editando && this.parcelamentoAtivo && this.quantidadeParcelas > 1) {
            this.salvarParcelamento();
            return;
        }

        const payload = this.montarPayloadDespesa();

        const request$ = this.editando
            ? this.despesaService.atualizarDespesa(payload)
            : this.despesaService.criarDespesa({
                descricao: payload.descricao,
                valor: payload.valor,
                data: payload.data,
                mesReferencia: payload.mesReferencia,
                idContaFinanceira: payload.idContaFinanceira,
                idCategoria: payload.idCategoria
            });

        this.salvandoDespesa = true;

        request$.pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
                this.salvandoDespesa = false;
                this.fecharModal();
                this.carregarDespesas();
                this.mostrarSucesso();
                this.verificarBadgeOrganizador();
            },
            error: (erro) => {
                this.salvandoDespesa = false;
                this.mostrarErro(erro);
            }
        });
    }

    adicionarDespesaAoLote() {
        if (this.editando || this.parcelamentoAtivo) return;

        if (!this.camposObrigatoriosPreenchidos()) {
            this.mostrarAlertaCamposObrigatorios();
            return;
        }

        const payload = this.montarPayloadDespesa();

        this.despesasEmLote = [
            ...this.despesasEmLote,
            {
                descricao: payload.descricao,
                valor: payload.valor,
                data: payload.data,
                mesReferencia: payload.mesReferencia,
                idContaFinanceira: payload.idContaFinanceira,
                idCategoria: payload.idCategoria,
                contaDescricao: this.obterNomeConta(payload.idContaFinanceira),
                categoriaDescricao: this.obterNomeCategoria(payload.idCategoria)
            }
        ];

        this.prepararProximaDespesa();
    }

    removerDespesaDoLote(index: number) {
        this.despesasEmLote = this.despesasEmLote.filter((_, i) => i !== index);
    }

    limparLote() {
        this.despesasEmLote = [];
    }

    salvarLoteDespesas() {
        if (this.despesasEmLote.length === 0) return;

        const requests = this.despesasEmLote.map(despesa =>
            this.despesaService.criarDespesa({
                descricao: despesa.descricao,
                valor: despesa.valor,
                data: despesa.data,
                mesReferencia: despesa.mesReferencia,
                idContaFinanceira: despesa.idContaFinanceira,
                idCategoria: despesa.idCategoria
            })
        );

        forkJoin(requests)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: () => {
                    this.limparLote();
                    this.fecharModal();
                    this.carregarDespesas();
                    Swal.fire({
                        icon: 'success',
                        title: 'Lote cadastrado!',
                        text: 'Todas as despesas do lote foram salvas.',
                        timer: 2200,
                        showConfirmButton: false
                    });
                },
                error: () => Swal.fire({
                    icon: 'error',
                    title: 'Erro!',
                    text: 'Não foi possível salvar todas as despesas do lote.',
                    confirmButtonColor: '#dc3545'
                })
            });
    }

    obterTotalLote(): number {
        return this.despesasEmLote.reduce((total, despesa) => total + despesa.valor, 0);
    }

    private montarPayloadDespesa() {
        return {
            id: this.novaDespesa.id,
            descricao: this.novaDespesa.descricao,
            valor: this.novaDespesa.valor,
            data: this.novaDespesa.data,
            mesReferencia: this.converterMesReferenciaParaApi(this.novaDespesa.mesReferencia),
            idContaFinanceira: this.novaDespesa.idContaFinanceira,
            idCategoria: this.obterIdCategoriaFinal()
        };
    }

    private montarPayloadParcelamento(): CriarParcelamentoRequest {
        return {
            descricao: this.novaDespesa.descricao,
            valorTotal: this.novaDespesa.valor,
            dataInicial: this.novaDespesa.data,
            mesReferenciaInicial: this.converterMesReferenciaParaApi(this.novaDespesa.mesReferencia),
            quantidadeParcelas: this.quantidadeParcelas,
            idContaFinanceira: this.novaDespesa.idContaFinanceira,
            idCategoria: this.obterIdCategoriaFinal()
        };
    }

    private obterIdCategoriaFinal(): string {
        return this.novaDespesa.idCategoriaEspecifica ||
            this.novaDespesa.idNaturezaDespesa ||
            this.novaDespesa.idTipoDespesa;
    }

    private camposObrigatoriosPreenchidos(): boolean {
        return !!(
            this.novaDespesa.descricao &&
            this.novaDespesa.valor > 0 &&
            this.novaDespesa.data &&
            this.novaDespesa.mesReferencia &&
            this.novaDespesa.idContaFinanceira &&
            this.novaDespesa.idTipoDespesa
        );
    }

    parcelamentoValido(): boolean {
        const quantidade = Number(this.quantidadeParcelas);

        return !this.parcelamentoAtivo || (
            Number.isInteger(quantidade) &&
            quantidade >= 1 &&
            quantidade <= 120 &&
            this.novaDespesa.valor > 0 &&
            !!this.novaDespesa.data
        );
    }

    onParcelamentoToggle() {
        if (!this.parcelamentoAtivo) {
            this.quantidadeParcelas = 1;
            this.parcelasPreview = [];
            return;
        }

        this.quantidadeParcelas = Number(this.quantidadeParcelas);

        if (this.quantidadeParcelas < 2) {
            this.quantidadeParcelas = 2;
        }

        this.atualizarPreviewParcelamento();
    }

    atualizarPreviewParcelamento() {
        this.quantidadeParcelas = Number(this.quantidadeParcelas);

        if (!this.parcelamentoAtivo || !this.parcelamentoValido() || this.quantidadeParcelas <= 1) {
            this.parcelasPreview = [];
            return;
        }

        this.parcelasPreview = this.calcularParcelasPreview(
            this.novaDespesa.valor,
            this.quantidadeParcelas,
            this.novaDespesa.data
        );
    }

    calcularParcelasPreview(valorTotal: number, quantidadeParcelas: number, dataInicial: string): ParcelaPreview[] {
        if (valorTotal <= 0 || quantidadeParcelas < 1 || !Number.isInteger(quantidadeParcelas)) {
            return [];
        }

        const totalCentavos = Math.round(valorTotal * 100);
        const valorBase = Math.floor(totalCentavos / quantidadeParcelas);
        const resto = totalCentavos % quantidadeParcelas;

        return Array.from({ length: quantidadeParcelas }, (_, index) => {
            const valorCentavos = valorBase + (index < resto ? 1 : 0);
            const data = this.adicionarMesesComAjuste(dataInicial, index);

            return {
                numeroParcela: index + 1,
                totalParcelas: quantidadeParcelas,
                valor: valorCentavos / 100,
                data,
                mesReferencia: this.converterMesReferenciaParaApi(this.obterMesReferenciaInput(data))
            };
        });
    }

    private adicionarMesesComAjuste(dataInicial: string, mesesParaAdicionar: number): string {
        const [ano, mes, dia] = dataInicial.split('-').map(Number);
        const mesIndex = mes - 1 + mesesParaAdicionar;
        const ultimoDiaDoMes = new Date(ano, mesIndex + 1, 0).getDate();
        const data = new Date(ano, mesIndex, Math.min(dia, ultimoDiaDoMes));
        const anoFinal = data.getFullYear();
        const mesFinal = String(data.getMonth() + 1).padStart(2, '0');
        const diaFinal = String(data.getDate()).padStart(2, '0');

        return `${anoFinal}-${mesFinal}-${diaFinal}`;
    }

    private salvarParcelamento() {
        if (!this.parcelamentoValido()) {
            this.mostrarAlertaParcelamentoInvalido();
            return;
        }

        this.salvandoParcelamento = true;

        this.despesaService.criarParcelamento(this.montarPayloadParcelamento())
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response) => {
                    this.salvandoParcelamento = false;
                    this.fecharModal();
                    this.carregarDespesas();
                    this.resetForm();
                    Swal.fire({
                        icon: 'success',
                        title: 'Despesa parcelada cadastrada!',
                        text: `${response.quantidadeParcelas} parcelas foram criadas.`,
                        timer: 2200,
                        showConfirmButton: false
                    });
                    this.verificarBadgeOrganizador();
                },
                error: () => {
                    this.salvandoParcelamento = false;
                    this.mostrarErroParcelamento();
                }
            });
    }

    private mostrarAlertaParcelamentoInvalido() {
        Swal.fire({
            icon: 'warning',
            title: 'Parcelamento inválido!',
            text: 'Informe um valor maior que zero e uma quantidade de parcelas entre 1 e 120.',
            confirmButtonColor: '#d4af37'
        });
    }

    private mostrarAlertaCamposObrigatorios() {
        Swal.fire({ icon: 'warning', title: 'Campos obrigatórios!', text: 'Preencha todos os campos.', confirmButtonColor: '#d4af37' });
    }

    private mostrarSucesso() {
        Swal.fire({ icon: 'success', title: this.editando ? 'Atualizada!' : 'Cadastrada!', timer: 2000, showConfirmButton: false });
    }

    private mostrarErro(erro?: unknown) {
        Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar despesa!',
            text: this.extrairMensagemErroSalvar(erro),
            confirmButtonColor: '#dc3545'
        });
    }

    private mostrarErroParcelamento() {
        Swal.fire({
            icon: 'error',
            title: 'Erro ao salvar parcelamento!',
            text: 'Não foi possível criar todas as parcelas. Revise os dados e tente novamente.',
            confirmButtonColor: '#dc3545'
        });
    }

    private extrairMensagemErroSalvar(erro: unknown): string {
        const httpError = erro as {
            status?: number;
            error?: { message?: string; errors?: { Mensagens?: string[] } };
            message?: string;
        };

        if (httpError.status === 401) {
            return 'Sessão expirada. Faça login novamente.';
        }

        return httpError.error?.errors?.Mensagens?.join(', ') ||
            httpError.error?.message ||
            httpError.message ||
            'Não foi possível salvar. Revise os dados e tente novamente.';
    }

    private prepararProximaDespesa() {
        this.novaDespesa = {
            ...this.novaDespesa,
            id: '',
            descricao: '',
            valor: 0
        };
    }

    obterMesReferenciaTexto(mesReferencia?: string): string {
        if (!mesReferencia) return 'Sem referência';

        const data = new Date(`${this.obterMesReferenciaInput(mesReferencia)}-01T00:00:00`);
        return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }

    formatarData(data: string): string {
        const [ano, mes, dia] = data.substring(0, 10).split('-').map(Number);
        return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
    }

    temParcelamento(despesa: Despesa): boolean {
        return !!despesa.numeroParcela && !!despesa.totalParcelas && despesa.totalParcelas > 1;
    }

    obterRotuloParcela(despesa: Despesa): string {
        if (!this.temParcelamento(despesa)) {
            return '';
        }

        return `Parcela ${despesa.numeroParcela}/${despesa.totalParcelas}`;
    }

    obterNomeConta(id: string): string {
        return this.contas.find(c => c.id === id)?.descricao || 'Conta Desconhecida';
    }

    private obterMesReferenciaInput(data: Date | string): string {
        if (typeof data === 'string' && /^\d{4}-\d{2}/.test(data)) {
            return data.substring(0, 7);
        }

        const valor = data instanceof Date ? data : new Date(data);
        const ano = valor.getFullYear();
        const mes = String(valor.getMonth() + 1).padStart(2, '0');
        return `${ano}-${mes}`;
    }

    private converterMesReferenciaParaApi(mesReferencia: string): string {
        return `${mesReferencia}-01`;
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

    calcularMediaDiaria(): number {
        const diasDoMes = this.obterDiasDoMes();
        return diasDoMes > 0 ? this.totalDespesas / diasDoMes : 0;
    }

    obterDiasDoMes(): number {
        return new Date(
            this.mesAtual.getFullYear(),
            this.mesAtual.getMonth() + 1,
            0
        ).getDate();
    }

    private atualizarMensagemCarregamento(): void {
        this.mensagemCarregamento = financialStateMessage(this.estadoCarregamento, this.mesAtual, 'despesas');
    }
}
