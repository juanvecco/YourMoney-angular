import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContaFinanceiraService } from './conta';

describe('ContaFinanceiraService', () => {
  let service: ContaFinanceiraService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ContaFinanceiraService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses the typed singular account endpoint for CRUD', () => {
    service.criarConta({ descricao: 'Carteira' }).subscribe();
    let request = http.expectOne(req => req.url.endsWith('/ContaFinanceira'));
    expect(request.request.method).toBe('POST');
    request.flush({ id: '1', descricao: 'Carteira' });

    service.atualizarConta('1', { descricao: 'Conta principal' }).subscribe();
    request = http.expectOne(req => req.url.endsWith('/ContaFinanceira/1'));
    expect(request.request.method).toBe('PUT');
    request.flush({ id: '1', descricao: 'Conta principal' });

    service.removerConta('1').subscribe();
    request = http.expectOne(req => req.url.endsWith('/ContaFinanceira/1'));
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
