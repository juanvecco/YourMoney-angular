import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OpenFinanceService } from './openfinance';
import { environment } from '../../environments/environment';

describe('OpenFinanceService', () => {
  let service: OpenFinanceService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OpenFinanceService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(OpenFinanceService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('queries OpenFinance sources from environment api url', () => {
    const response = {
      readiness: {
        mode: 'preview-only',
        realDataEnabled: false,
        summary: 'Preview',
        nextSteps: []
      },
      sources: []
    };

    service.obterFontes().subscribe(result => expect(result).toEqual(response as any));

    const request = httpTesting.expectOne(`${environment.apiUrl}/OpenFinance/sources`);
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('queries transaction preview with optional source id', () => {
    service.obterPreviewTransacoes('mock-transactions').subscribe();

    const request = httpTesting.expectOne(
      req => req.url === `${environment.apiUrl}/OpenFinance/transactions/preview`
        && req.params.get('sourceId') === 'mock-transactions'
    );
    expect(request.request.method).toBe('GET');
    request.flush({ sourceId: 'mock-transactions', mode: 'preview-only', items: [] });
  });

  it('queries transaction preview without source id', () => {
    service.obterPreviewTransacoes().subscribe();

    const request = httpTesting.expectOne(`${environment.apiUrl}/OpenFinance/transactions/preview`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.has('sourceId')).toBeFalse();
    request.flush({ sourceId: 'mock-transactions', mode: 'preview-only', items: [] });
  });
});
