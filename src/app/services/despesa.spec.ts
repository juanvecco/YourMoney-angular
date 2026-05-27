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
});
