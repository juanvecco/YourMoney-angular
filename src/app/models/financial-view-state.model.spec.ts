import { financialStateMessage, FinancialViewState } from './financial-view-state.model';

describe('FinancialViewState', () => {
  const period = new Date(2026, 6, 1);
  const states: FinancialViewState[] = [
    'loading', 'refreshing', 'loadedWithData', 'emptyPeriod', 'loadError', 'stale', 'unauthenticated'
  ];

  it('supports every shared financial state', () => {
    expect(states).toHaveSize(7);
  });

  it('provides pt-BR messages for visible states', () => {
    expect(financialStateMessage('loading', period, 'receitas')).toContain('julho de 2026');
    expect(financialStateMessage('refreshing', period, 'receitas')).toContain('Atualizando');
    expect(financialStateMessage('emptyPeriod', period, 'receitas')).toContain('Nenhum registro');
    expect(financialStateMessage('loadError', period, 'receitas')).toContain('Não foi possível');
    expect(financialStateMessage('stale', period, 'receitas')).toContain('desatualizados');
    expect(financialStateMessage('unauthenticated', period, 'receitas')).toContain('Sessão expirada');
    expect(financialStateMessage('loadedWithData', period, 'receitas')).toBe('');
  });
});
