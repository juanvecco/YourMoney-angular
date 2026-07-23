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
      descricao: 'Reserva',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 100,
      valorAtual: 110,
      dataInvestimento: '2026-06-09',
      mesReferencia: '2026-05-01',
      receitaRecorrenteId: null,
      operacaoId: 'operacao-1'
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
      descricao: 'Reserva',
      tipo: 'Renda fixa',
      quantidade: 1,
      precoMedio: 100,
      valorAtual: 110,
      dataInvestimento: '2026-06-09',
      mesReferencia: '2026-07-01',
      receitaRecorrenteId: 'salario-1'
    };

    service.atualizarInvestimento(request).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/Investimento/investimento-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.id).toBeUndefined();
    expect(req.request.body.mesReferencia).toBe('2026-07-01');
    req.flush({ ...request, id: 'investimento-1', dataResgate: null, ativo: true });
  });

  it('gets the consolidated wallet without month parameters and propagates failures', () => {
    let failed = false;
    service.obterConsolidado().subscribe({ error: () => failed = true });
    const req = httpMock.expectOne(`${environment.apiUrl}/Investimento/consolidado`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ message: 'falha' }, { status: 500, statusText: 'Error' });
    expect(failed).toBeTrue();
  });

  it('gets an investment by id', () => {
    service.obterPorId('investimento-1').subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/Investimento/investimento-1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
