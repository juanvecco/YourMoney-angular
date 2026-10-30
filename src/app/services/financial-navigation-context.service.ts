import { Injectable, signal } from '@angular/core';
import {
  EMPTY_EXPENSE_FILTERS,
  ExpenseViewFilters,
  FinancialPeriod,
  financialPeriodFromDate,
} from '../models/financial-navigation-context.model';

@Injectable({ providedIn: 'root' })
export class FinancialNavigationContextService {
  private readonly periodState = signal(this.currentPeriod());
  private readonly expenseFiltersState = signal<ExpenseViewFilters>({ ...EMPTY_EXPENSE_FILTERS });
  private readonly sessionRevisionState = signal(0);

  readonly period = this.periodState.asReadonly();
  readonly expenseFilters = this.expenseFiltersState.asReadonly();
  readonly sessionRevision = this.sessionRevisionState.asReadonly();

  setPeriod(value: Date | string | FinancialPeriod): boolean {
    const normalized = this.normalizePeriod(value);
    if (!normalized) return false;
    this.periodState.set(normalized);
    return true;
  }

  shiftPeriod(monthDelta: number): void {
    if (!Number.isInteger(monthDelta)) return;
    const current = this.periodState();
    this.setPeriod(new Date(current.year, current.month - 1 + monthDelta, 1));
  }

  setExpenseFilters(value: ExpenseViewFilters): void {
    this.expenseFiltersState.set({
      idContaFinanceira: value.idContaFinanceira?.trim() ?? '',
      idTipoDespesa: value.idTipoDespesa?.trim() ?? '',
      idNaturezaDespesa: value.idNaturezaDespesa?.trim() ?? '',
    });
  }

  clearExpenseFilters(): void {
    this.expenseFiltersState.set({ ...EMPTY_EXPENSE_FILTERS });
  }

  resetPrivateContext(): void {
    this.periodState.set(this.currentPeriod());
    this.clearExpenseFilters();
    this.sessionRevisionState.update(value => value + 1);
  }

  private normalizePeriod(value: Date | string | FinancialPeriod): FinancialPeriod | null {
    if (value instanceof Date) return financialPeriodFromDate(value);
    if (typeof value === 'string') {
      const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
      return match ? financialPeriodFromDate(new Date(Number(match[1]), Number(match[2]) - 1, 1)) : null;
    }
    return value && value.date instanceof Date ? financialPeriodFromDate(value.date) : null;
  }

  private currentPeriod(): FinancialPeriod {
    return financialPeriodFromDate(new Date())!;
  }
}
