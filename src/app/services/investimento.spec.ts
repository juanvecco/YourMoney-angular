import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { InvestimentoService } from './investimento';

describe('InvestimentoService', () => {
  let service: InvestimentoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InvestimentoService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(InvestimentoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('posts only the typed create payload', () => {
    const request = {
      nome: 'Tesouro',
      descricao: '',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 100,
      valorAtual: 110,
      dataInvestimento: '2026-06-09'
    };
    const response = {
      id: 'investimento-1',
      ...request,
      dataInvestimento: '2026-06-09T00:00:00',
      dataResgate: null,
      ativo: true
    };

    service.criarInvestimento(request).subscribe(result => expect(result).toEqual(response));

    const req = httpMock.expectOne(`${environment.apiUrl}/Investimento`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.body.id).toBeUndefined();
    expect(req.request.body.usuarioId).toBeUndefined();
    expect(req.request.body.ativo).toBeUndefined();
    expect(req.request.body.dataResgate).toBeUndefined();
    req.flush(response);
  });
});
