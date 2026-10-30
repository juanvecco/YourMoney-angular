import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-month-picker', standalone: true, templateUrl: './month-picker.html', styleUrl: './month-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthPickerComponent {
  @Input({ required: true }) period = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  @Output() readonly periodChange = new EventEmitter<Date>();
  get label(): string { return this.period.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); }
  get inputValue(): string { return `${this.period.getFullYear()}-${String(this.period.getMonth() + 1).padStart(2, '0')}`; }
  shift(monthDelta: number): void {
    this.periodChange.emit(new Date(this.period.getFullYear(), this.period.getMonth() + monthDelta, 1));
  }
  select(value: string): void {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return;
    const [year, month] = value.split('-').map(Number);
    this.periodChange.emit(new Date(year, month - 1, 1));
  }
}
