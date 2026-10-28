import { Pipe, PipeTransform } from '@angular/core';
import { FinancialVisibilityService } from '../services/financial-visibility.service';

@Pipe({ name: 'financialValue', standalone: true, pure: false })
export class FinancialValuePipe implements PipeTransform {
  constructor(private readonly visibility: FinancialVisibilityService) {}

  transform(value: number | string | null | undefined, currencyCode = 'BRL'): string {
    if (value === null || value === undefined || value === '') return '';
    if (this.visibility.valuesHidden()) return '....';
    return typeof value === 'number' ? this.visibility.formatCurrency(value, currencyCode) : value;
  }
}
