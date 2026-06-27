import { of, throwError } from 'rxjs';
import { OpenFinancePageComponent } from './openfinance-page';
import { OpenFinanceService } from '../../../services/openfinance';
import {
  OpenFinanceSourcesResponse,
  OpenFinanceTransactionPreviewResponse
} from '../../../models/openfinance.model';

describe('OpenFinancePageComponent', () => {
  let component: OpenFinancePageComponent;
  let openFinanceService: jasmine.SpyObj<OpenFinanceService>;

  const sourcesResponse: OpenFinanceSourcesResponse = {
    readiness: {
      mode: 'preview-only',
      realDataEnabled: false,
      summary: 'Somente preview',
      nextSteps: ['Consentimento futuro']
    },
    sources: [
      {
        id: 'mock-transactions',
        name: 'Mock',
        type: 'simulated',
        status: 'available',
        message: 'Disponivel',
        supportsTransactionPreview: true
      },
      {
        id: 'real-openfinance',
        name: 'Real',
        type: 'future-consent',
        status: 'not-configured',
        message: 'Futuro',
        supportsTransactionPreview: false
      }
    ]
  };

  const previewResponse: OpenFinanceTransactionPreviewResponse = {
    sourceId: 'mock-transactions',
    mode: 'preview-only',
    items: [
      {
        id: 'mock-001',
        sourceId: 'mock-transactions',
        transactionDate: '2026-06-05',
        description: 'Salario',
        amount: 5000,
        direction: 'inflow',
        suggestedFinancialType: 'receita',
        duplicateRisk: false,
        importStatus: 'preview-only'
      },
      {
        id: 'mock-002',
        sourceId: 'mock-transactions',
        transactionDate: '2026-06-06',
        description: 'Supermercado',
        amount: 248.75,
        direction: 'outflow',
        suggestedFinancialType: 'despesa',
        duplicateRisk: true,
        duplicateReason: 'Possivel duplicidade',
        importStatus: 'preview-only'
      }
    ]
  };

  beforeEach(() => {
    openFinanceService = jasmine.createSpyObj<OpenFinanceService>('OpenFinanceService', [
      'obterFontes',
      'obterPreviewTransacoes'
    ]);
    openFinanceService.obterFontes.and.returnValue(of(sourcesResponse));
    openFinanceService.obterPreviewTransacoes.and.returnValue(of(previewResponse));

    component = new OpenFinancePageComponent(openFinanceService);
  });

  it('loads sources and readiness without enabling real data', () => {
    component.carregarFontes();

    expect(component.estadoFontes).toBe('loaded');
    expect(component.fontes.length).toBe(2);
    expect(component.readiness?.mode).toBe('preview-only');
    expect(component.readiness?.realDataEnabled).toBeFalse();
  });

  it('shows empty and error states for sources', () => {
    openFinanceService.obterFontes.and.returnValue(of({ ...sourcesResponse, sources: [] }));

    component.carregarFontes();

    expect(component.estadoFontes).toBe('empty');

    openFinanceService.obterFontes.and.returnValue(throwError(() => new Error('falha')));
    component.carregarFontes();

    expect(component.estadoFontes).toBe('error');
    expect(component.mensagemErroFontes).toContain('Nao foi possivel');
  });

  it('preserves last known source status after a reload failure', () => {
    component.carregarFontes();
    openFinanceService.obterFontes.and.returnValue(throwError(() => new Error('falha')));

    component.carregarFontes();

    expect(component.estadoFontes).toBe('loaded');
    expect(component.fontes.length).toBe(2);
    expect(component.readiness?.summary).toBe('Somente preview');
  });

  it('loads transaction preview and keeps status preview-only', () => {
    component.carregarPreview();

    expect(openFinanceService.obterPreviewTransacoes).toHaveBeenCalledWith('mock-transactions');
    expect(component.estadoPreview).toBe('loaded');
    expect(component.transacoes.length).toBe(2);
    expect(component.transacoes.every(item => item.importStatus === 'preview-only')).toBeTrue();
    expect(component.transacoes.some(item => item.duplicateRisk)).toBeTrue();
  });

  it('updates suggested classification locally only', () => {
    component.carregarPreview();

    component.atualizarClassificacaoLocal(component.transacoes[0], 'despesa');

    expect(component.transacoes[0].suggestedFinancialType).toBe('despesa');
    expect(openFinanceService.obterPreviewTransacoes).toHaveBeenCalledTimes(1);
  });

  it('shows error state for preview failures', () => {
    openFinanceService.obterPreviewTransacoes.and.returnValue(throwError(() => new Error('falha')));

    component.carregarPreview();

    expect(component.estadoPreview).toBe('error');
    expect(component.transacoes.length).toBe(0);
    expect(component.mensagemErroPreview).toContain('Nao foi possivel');
  });

  it('identifies only available sources as preview capable', () => {
    expect(component.fonteSuportaPreview(sourcesResponse.sources[0])).toBeTrue();
    expect(component.fonteSuportaPreview(sourcesResponse.sources[1])).toBeFalse();
  });
});
