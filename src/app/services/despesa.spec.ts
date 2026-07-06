import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DespesaService } from './despesa';
import { environment } from '../../environments/environment';

describe('DespesaService', () => {
  let service: DespesaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DespesaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(DespesaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should post parcelamento requests to the typed endpoint', () => {
    const request = {
      descricao: 'Notebook',
      valorTotal: 1000,
      dataInicial: '2026-05-26',
      mesReferenciaInicial: '2026-05-01',
      quantidadeParcelas: 3,
      idContaFinanceira: 'conta-1',
      idCategoria: 'categoria-1'
    };

    const response = {
      parcelamentoId: 'parcelamento-1',
      valorTotal: 1000,
      quantidadeParcelas: 3,
      parcelas: [
        {
          id: 'despesa-1',
          data: '2026-05-26',
          mesReferencia: '2026-05-01',
          descricao: 'Notebook',
          valor: 333.34,
          idContaFinanceira: 'conta-1',
          idCategoria: 'categoria-1',
          parcelamentoId: 'parcelamento-1',
          numeroParcela: 1,
          totalParcelas: 3,
          valorTotalParcelamento: 1000
        }
      ]
    };

    service.criarParcelamento(request).subscribe(result => {
      expect(result).toEqual(response);
      expect(result.quantidadeParcelas).toBe(3);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/Despesas/parcelamento`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(response);
  });

  it('should send consulta filters and pagination params to the typed endpoint', () => {
    const response = {
      itens: [
        {
          id: 'despesa-1',
          data: '2026-05-10',
          mesReferencia: '2026-05-01',
          descricao: 'Mercado',
          valor: 120,
          idContaFinanceira: 'conta-1',
          idCategoria: 'natureza-mercado'
        }
      ],
      paginaAtual: 2,
      tamanhoPagina: 10,
      totalResultados: 14,
      totalPaginas: 2,
      valorTotalFiltrado: 450,
      totaisPorConta: [
        { idContaFinanceira: 'conta-1', valor: 450 }
      ]
    };

    service.consultarDespesas({
      mes: 5,
      ano: 2026,
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-mercado',
      pagina: 2,
      tamanhoPagina: 10
    }).subscribe(result => {
      expect(result).toEqual(response);
      expect(result.valorTotalFiltrado).toBe(450);
    });

    const req = httpMock.expectOne(request =>
      request.url === `${environment.apiUrl}/Despesas/consulta`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('mes')).toBe('5');
    expect(req.request.params.get('ano')).toBe('2026');
    expect(req.request.params.get('idContaFinanceira')).toBe('conta-1');
    expect(req.request.params.get('idTipoDespesa')).toBe('tipo-essencial');
    expect(req.request.params.get('idNaturezaDespesa')).toBe('natureza-mercado');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('tamanhoPagina')).toBe('10');
    req.flush(response);
  });

  it('should use default pagination and omit empty optional consulta params', () => {
    const response = {
      itens: [],
      paginaAtual: 1,
      tamanhoPagina: 10,
      totalResultados: 0,
      totalPaginas: 0,
      valorTotalFiltrado: 0,
      totaisPorConta: []
    };

    service.consultarDespesas({
      mes: 6,
      ano: 2026
    }).subscribe(result => {
      expect(result.totalResultados).toBe(0);
      expect(result.valorTotalFiltrado).toBe(0);
    });

    const req = httpMock.expectOne(request =>
      request.url === `${environment.apiUrl}/Despesas/consulta`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('mes')).toBe('6');
    expect(req.request.params.get('ano')).toBe('2026');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamanhoPagina')).toBe('10');
    expect(req.request.params.has('idContaFinanceira')).toBeFalse();
    expect(req.request.params.has('idTipoDespesa')).toBeFalse();
    expect(req.request.params.has('idNaturezaDespesa')).toBeFalse();
    req.flush(response);
  });
});
