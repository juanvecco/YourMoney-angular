import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AporteObjetivoService } from './aporte-objetivo';

describe('AporteObjetivoService', () => {
  let service: AporteObjetivoService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AporteObjetivoService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('confirma aporte idempotente sem enviar usuario', () => {
    const request = { valor: 1000, dataConfirmacao: '2026-10-26', operacaoId: '11111111-1111-1111-1111-111111111111', investimentoId: null };
    service.confirmar('meta-1', request).subscribe();
    const chamada = http.expectOne('https://localhost:5001/api/Metas/meta-1/aportes');
    expect(chamada.request.method).toBe('POST');
    expect(chamada.request.body).toEqual(request);
    expect(chamada.request.body.usuarioId).toBeUndefined();
    chamada.flush({});
  });

  it('aloca aporte depois da confirmação', () => {
    service.alocar('meta-1', 'aporte-1', { investimentoId: 'investimento-1' }).subscribe();
    const chamada = http.expectOne('https://localhost:5001/api/Metas/meta-1/aportes/aporte-1/alocacao');
    expect(chamada.request.method).toBe('PUT');
    chamada.flush({});
  });
});
