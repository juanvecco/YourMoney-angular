import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MovimentacaoService } from './movimentacao';

describe('MovimentacaoService', () => {
  let service: MovimentacaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MovimentacaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('serializes combined filters without sending blank values', () => {
    service.consultar({
      mesInicial: '2026-01', mesFinal: '2026-03', tipo: 'despesa',
      contaFinanceiraId: 'conta-1', busca: '  mercado  ', pagina: 2, tamanhoPagina: 10,
    }).subscribe();

    const request = http.expectOne(req => req.url.endsWith('/Movimentacoes'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('mesInicial')).toBe('2026-01');
    expect(request.request.params.get('tipo')).toBe('despesa');
    expect(request.request.params.get('contaFinanceiraId')).toBe('conta-1');
    expect(request.request.params.get('busca')).toBe('mercado');
    expect(request.request.params.get('pagina')).toBe('2');
    request.flush({ itens: [], pagina: 2, tamanhoPagina: 10, totalItens: 0, totalPaginas: 0,
      totais: { receitas: 0, despesas: 0, investimentos: 0, saldo: 0 } });
  });
});
