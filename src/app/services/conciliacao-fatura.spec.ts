import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConciliacaoFaturaService } from './conciliacao-fatura';
import { environment } from '../../environments/environment';

describe('ConciliacaoFaturaService', () => {
  let service: ConciliacaoFaturaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ConciliacaoFaturaService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ConciliacaoFaturaService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('gets a month and account summary from the authenticated API path', () => {
    const expected = { idContaFinanceira: 'conta', mes: 11, ano: 2026, valorInformado: null,
      totalCadastrado: 0, diferenca: null, quantidadeDespesas: 0, quantidadePendentes: 0 };
    service.obter('conta', 11, 2026).subscribe(result => expect(result).toEqual(expected));
    const req = http.expectOne(r => r.url === `${environment.apiUrl}/ConciliacaoFatura/conta`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('mes')).toBe('11');
    expect(req.request.params.get('ano')).toBe('2026');
    req.flush(expected);
  });

  it('sends the entered amount including zero', () => {
    service.salvar('conta', { mes: 11, ano: 2026, valorInformado: 0 }).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/ConciliacaoFatura/conta`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ mes: 11, ano: 2026, valorInformado: 0 });
    req.flush({});
  });
});
