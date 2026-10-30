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

  it('posts a reviewed expense reconciliation to the typed endpoint', () => {
    const payload = {
      transactionId: 'source-transaction-1',
      action: 'link' as const,
      targetExpenseId: 'expense-1'
    };

    service.reconciliarDespesaPluggy(payload).subscribe(result => {
      expect(result.action).toBe('link');
      expect(result.recordId).toBe('expense-1');
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/OpenFinance/real-transactions/reconcile`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      transactionId: 'source-transaction-1',
      action: 'link',
      recordType: 'expense',
      recordId: 'expense-1',
      registeredAt: '2026-05-12T12:00:00Z'
    });
  });

  it('loads investment assets from the dedicated positions endpoint', () => {
    const response = { generatedAt: '2026-10-30T10:00:00Z', connections: [], assets: [] };
    service.obterAtivosInvestimentoPluggy('connection-1').subscribe(result => expect(result).toEqual(response as any));

    const request = httpTesting.expectOne(req => req.url === `${environment.apiUrl}/OpenFinance/investments/preview`
      && req.params.get('connectionId') === 'connection-1');
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('requests a failed asset retry for only the selected connection', () => {
    const response = { generatedAt: '2026-10-30T10:00:00Z', connections: [], assets: [] };
    service.obterAtivosInvestimentoPluggy('connection-1', true).subscribe(result => expect(result).toEqual(response as any));

    const request = httpTesting.expectOne(req => req.url === `${environment.apiUrl}/OpenFinance/investments/preview`
      && req.params.get('connectionId') === 'connection-1'
      && req.params.get('retryFailed') === 'true');
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('posts asset reconciliation with the persisted snapshot identity', () => {
    const payload = {
      connectionId: 'connection-1', externalInvestmentId: 'asset-1',
      snapshotToken: '2026-10-30T10:00:00.0000000+00:00', action: 'link' as const,
      targetInvestmentId: 'investment-1'
    };
    service.reconciliarAtivoInvestimentoPluggy(payload).subscribe(result => {
      expect(result.investmentId).toBe('investment-1');
      expect(result.action).toBe('link');
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/OpenFinance/investments/reconcile`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ externalInvestmentId: 'asset-1', action: 'link', investmentId: 'investment-1', registeredAt: '2026-10-30T10:00:00Z' });
  });
});
