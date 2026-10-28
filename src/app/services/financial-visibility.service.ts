import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'yourmoney-financial-values-hidden';

@Injectable({ providedIn: 'root' })
export class FinancialVisibilityService {
  private readonly hiddenState = signal(this.readPreference());
  readonly valuesHidden = this.hiddenState.asReadonly();

  toggle(): void {
    const hidden = !this.hiddenState();
    this.hiddenState.set(hidden);
    try {
      localStorage.setItem(STORAGE_KEY, String(hidden));
    } catch {
      // A preferência continua valendo durante a sessão se o navegador bloquear armazenamento local.
    }
  }

  formatCurrency(value: number, currencyCode = 'BRL'): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private readPreference(): boolean {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
