export interface FinancialPeriod {
  year: number;
  month: number;
  key: string;
  date: Date;
}

export interface ExpenseViewFilters {
  idContaFinanceira: string;
  idTipoDespesa: string;
  idNaturezaDespesa: string;
}

export const EMPTY_EXPENSE_FILTERS: ExpenseViewFilters = {
  idContaFinanceira: '',
  idTipoDespesa: '',
  idNaturezaDespesa: '',
};

export function financialPeriodFromDate(value: Date): FinancialPeriod | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const year = value.getFullYear();
  const month = value.getMonth() + 1;
  if (year < 1900 || year > 9999) return null;
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}`, date: new Date(year, month - 1, 1) };
}
