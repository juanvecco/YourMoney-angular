import { TestBed } from '@angular/core/testing';
import { FinancialNavigationContextService } from './financial-navigation-context.service';

describe('FinancialNavigationContextService', () => {
  let service: FinancialNavigationContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FinancialNavigationContextService] });
    service = TestBed.inject(FinancialNavigationContextService);
  });

  it('normalizes Date and YYYY-MM values to a local civil month', () => {
    expect(service.setPeriod(new Date(2026, 6, 28))).toBeTrue();
    expect(service.period().key).toBe('2026-07');
    expect(service.period().date).toEqual(new Date(2026, 6, 1));
    expect(service.setPeriod('2025-12')).toBeTrue();
    expect(service.period().month).toBe(12);
  });

  it('rejects invalid periods without changing context', () => {
    const original = service.period();
    expect(service.setPeriod('2026-13')).toBeFalse();
    expect(service.period()).toBe(original);
  });

  it('keeps expense filters in memory and clears incompatible values', () => {
    service.setExpenseFilters({ idContaFinanceira: 'conta-1', idTipoDespesa: 'tipo-1', idNaturezaDespesa: 'natureza-1' });
    expect(service.expenseFilters().idNaturezaDespesa).toBe('natureza-1');
    service.setExpenseFilters({ idContaFinanceira: 'conta-1', idTipoDespesa: 'tipo-2', idNaturezaDespesa: '' });
    expect(service.expenseFilters().idNaturezaDespesa).toBe('');
  });

  it('resets private context and increments the session revision', () => {
    service.setPeriod('2022-01');
    const revision = service.sessionRevision();
    service.resetPrivateContext();
    expect(service.sessionRevision()).toBe(revision + 1);
    expect(service.expenseFilters()).toEqual({ idContaFinanceira: '', idTipoDespesa: '', idNaturezaDespesa: '' });
  });
});
