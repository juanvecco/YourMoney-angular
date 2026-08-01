export type FinancialViewState =
  | 'loading'
  | 'refreshing'
  | 'loadedWithData'
  | 'emptyPeriod'
  | 'loadError'
  | 'stale'
  | 'unauthenticated';

export function financialPeriodLabel(period: Date): string {
  return period.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function financialStateMessage(
  state: FinancialViewState,
  period: Date,
  resourceLabel: string
): string {
  const periodLabel = financialPeriodLabel(period);

  if (state === 'loading') {
    return `Carregando ${resourceLabel} de ${periodLabel}...`;
  }

  if (state === 'refreshing') {
    return `Atualizando ${resourceLabel} de ${periodLabel}...`;
  }

  if (state === 'emptyPeriod') {
    return `Nenhum registro de ${resourceLabel} em ${periodLabel}. Use as setas para consultar outro período.`;
  }

  if (state === 'loadError') {
    return `Não foi possível carregar ${resourceLabel}. Tente novamente em instantes.`;
  }

  if (state === 'stale') {
    return `Os dados de ${resourceLabel} podem estar desatualizados. Tente atualizar novamente.`;
  }

  if (state === 'unauthenticated') {
    return 'Sessão expirada. Faça login novamente.';
  }

  return '';
}
