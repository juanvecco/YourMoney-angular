import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonthPickerComponent } from './month-picker';

describe('MonthPickerComponent', () => {
  let fixture: ComponentFixture<MonthPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MonthPickerComponent] }).compileComponents();
    fixture = TestBed.createComponent(MonthPickerComponent);
    fixture.componentRef.setInput('period', new Date(2026, 6, 1));
    fixture.detectChanges();
  });

  it('formats the civil month in pt-BR and names controls', () => {
    expect(fixture.nativeElement.textContent).toContain('julho de 2026');
    expect(fixture.nativeElement.querySelector('[aria-label="Mês anterior"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[aria-label="Próximo mês"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('input[type="month"]')).toBeTruthy();
  });

  it('emits previous, next and valid selected months', () => {
    spyOn(fixture.componentInstance.periodChange, 'emit');
    fixture.nativeElement.querySelector('[aria-label="Mês anterior"]').click();
    expect(fixture.componentInstance.periodChange.emit).toHaveBeenCalledWith(new Date(2026, 5, 1));
    fixture.nativeElement.querySelector('[aria-label="Próximo mês"]').click();
    expect(fixture.componentInstance.periodChange.emit).toHaveBeenCalledWith(new Date(2026, 7, 1));
  });
});
