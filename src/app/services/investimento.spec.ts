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
      dataInvestimento: '2026-06-09',
      mesReferencia: '2026-05-01'
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

  it('puts the typed update payload without the route id in the body', () => {
    const request = {
      id: 'investimento-1',
      nome: 'Tesouro',
      descricao: '',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 100,
      valorAtual: 110,
      dataInvestimento: '2026-06-09',
      mesReferencia: '2026-07-01'
    };

    service.atualizarInvestimento(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/Investimento/investimento-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.id).toBeUndefined();
    expect(req.request.body.mesReferencia).toBe('2026-07-01');
    req.flush({ ...request, id: 'investimento-1', dataResgate: null, ativo: true });
  });
});
