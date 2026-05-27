import { of, throwError } from 'rxjs';
import Swal from 'sweetalert2';
import { DespesasComponent } from './despesas-page';
import { DespesaService } from '../../../services/despesa';

describe('DespesasComponent', () => {
  let component: DespesasComponent;
  let despesaService: jasmine.SpyObj<DespesaService>;

  beforeEach(() => {
    despesaService = jasmine.createSpyObj<DespesaService>(
      'DespesaService',
      [
        'listarContas',
        'listarCategorias',
        'obterPorReferencia',
        'criarDespesa',
        'criarParcelamento',
        'atualizarDespesa',
        'deletarDespesa',
        'setCategorias'
      ],
      {
        todasCategorias: [
          { id: 'categoria-1', descricao: 'Casa', tipoTransacao: 1, categoriaPaiId: null }
        ]
      }
    );

    despesaService.listarContas.and.returnValue(of([]));
    despesaService.listarCategorias.and.returnValue(of([]));
    despesaService.obterPorReferencia.and.returnValue(of([]));
    despesaService.criarDespesa.and.returnValue(of({
      id: 'despesa-1',
      descricao: 'Mercado',
      valor: 10,
      data: '2026-05-27',
      mesReferencia: '2026-05-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1'
    }));
    despesaService.criarParcelamento.and.returnValue(of({
      parcelamentoId: 'parcelamento-1',
      valorTotal: 100,
      quantidadeParcelas: 3,
      parcelas: []
    }));

    component = new DespesasComponent(despesaService);
  });

  function preencherFormularioValido(): void {
    component.novaDespesa = {
      id: '',
      descricao: 'Notebook',
      valor: 100,
      data: '2026-05-31',
      mesReferencia: '2026-05',
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'categoria-1',
      idNaturezaDespesa: '',
      idCategoriaEspecifica: ''
    };
  }

  it('should distribute cents exactly across installment preview', () => {
    const preview = component.calcularParcelasPreview(100, 3, '2026-05-26');

    expect(preview.map(parcela => parcela.valor)).toEqual([33.34, 33.33, 33.33]);
    expect(preview.reduce((total, parcela) => total + parcela.valor, 0)).toBeCloseTo(100, 2);
  });

  it('should clamp end-of-month dates for generated installments', () => {
    const preview = component.calcularParcelasPreview(90, 3, '2026-01-31');

    expect(preview.map(parcela => parcela.data)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31'
    ]);
  });

  it('should switch to parcelada mode and generate preview', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;
    component.quantidadeParcelas = 3;

    component.atualizarPreviewParcelamento();

    expect(component.parcelasPreview.length).toBe(3);
    expect(component.parcelasPreview[0].numeroParcela).toBe(1);
    expect(component.parcelasPreview[2].totalParcelas).toBe(3);
  });

  it('should reject invalid installment quantities', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;

    component.quantidadeParcelas = 0;
    expect(component.parcelamentoValido()).toBeFalse();

    component.quantidadeParcelas = 121;
    expect(component.parcelamentoValido()).toBeFalse();
  });

  it('should reject zero or negative total values in parcelada mode', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;
    component.quantidadeParcelas = 3;

    component.novaDespesa.valor = 0;
    expect(component.parcelamentoValido()).toBeFalse();

    component.novaDespesa.valor = -1;
    expect(component.parcelamentoValido()).toBeFalse();
  });

  it('should call criarParcelamento for valid parcelada expenses', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;
    component.quantidadeParcelas = 3;
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);
    (globalThis as typeof globalThis & { bootstrap?: unknown }).bootstrap = {
      Modal: {
        getInstance: () => ({ hide: () => undefined })
      }
    };

    component.salvarDespesa();

    expect(despesaService.criarParcelamento).toHaveBeenCalledWith({
      descricao: 'Notebook',
      valorTotal: 100,
      dataInicial: '2026-05-31',
      mesReferenciaInicial: '2026-05-01',
      quantidadeParcelas: 3,
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1'
    });
    expect(despesaService.criarDespesa).not.toHaveBeenCalled();
  });

  it('should keep data and show error when parcelamento save fails', () => {
    preencherFormularioValido();
    component.parcelamentoAtivo = true;
    component.quantidadeParcelas = 3;
    component.atualizarPreviewParcelamento();
    despesaService.criarParcelamento.and.returnValue(throwError(() => new Error('fail')));
    spyOn(Swal, 'fire').and.returnValue(Promise.resolve({ isConfirmed: true }) as any);

    component.salvarDespesa();

    expect(component.novaDespesa.descricao).toBe('Notebook');
    expect(component.parcelasPreview.length).toBe(3);
    expect(component.salvandoParcelamento).toBeFalse();
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({
      icon: 'error',
      title: 'Erro ao salvar parcelamento!'
    }));
  });

  it('should render installment labels only for installment expenses', () => {
    expect(component.temParcelamento({
      id: 'despesa-1',
      descricao: 'Notebook',
      valor: 100,
      data: '2026-06-01',
      mesReferencia: '2026-06-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1',
      parcelamentoId: 'parcelamento-1',
      numeroParcela: 2,
      totalParcelas: 6,
      valorTotalParcelamento: 600
    })).toBeTrue();

    expect(component.obterRotuloParcela({
      id: 'despesa-1',
      descricao: 'Notebook',
      valor: 100,
      data: '2026-06-01',
      mesReferencia: '2026-06-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1',
      parcelamentoId: 'parcelamento-1',
      numeroParcela: 2,
      totalParcelas: 6,
      valorTotalParcelamento: 600
    })).toBe('Parcela 2/6');

    expect(component.temParcelamento({
      id: 'despesa-2',
      descricao: 'Mercado',
      valor: 50,
      data: '2026-06-01',
      mesReferencia: '2026-06-01',
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1'
    })).toBeFalse();
  });
});
