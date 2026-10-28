import { Directive, ElementRef, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { NgModel } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FinancialVisibilityService } from '../services/financial-visibility.service';

@Directive({
  selector: 'input[financialValueInput]',
  standalone: true,
})
export class FinancialValueInputDirective implements OnInit, OnDestroy {
  private readonly input = inject(ElementRef<HTMLInputElement>).nativeElement;
  private readonly model = inject(NgModel, { optional: true });
  private readonly visibility = inject(FinancialVisibilityService);
  private readonly originalType = this.input.type;
  private readonly originalReadOnly = this.input.readOnly;
  private savedValue = this.input.value;
  private readonly visibilityEffect = effect(() => this.render(this.visibility.valuesHidden()));
  private modelSubscription?: Subscription;

  ngOnInit(): void {
    this.modelSubscription = this.model?.valueChanges?.subscribe((value) => {
      this.savedValue = value === null || value === undefined ? '' : String(value);
      if (this.visibility.valuesHidden()) this.showMask();
    });
  }

  ngOnDestroy(): void {
    this.visibilityEffect.destroy();
    this.modelSubscription?.unsubscribe();
  }

  private render(hidden: boolean): void {
    if (hidden) {
      const modelValue = this.model?.model;
      if (modelValue !== null && modelValue !== undefined) this.savedValue = String(modelValue);
      else if (this.input.value !== '....') this.savedValue = this.input.value;
      this.showMask();
      return;
    }

    this.input.type = this.originalType;
    this.input.readOnly = this.originalReadOnly;
    const modelValue = this.model?.model;
    this.input.value = modelValue === null || modelValue === undefined ? this.savedValue : String(modelValue);
  }

  private showMask(): void {
    this.input.type = 'text';
    this.input.readOnly = true;
    this.input.value = '....';
  }
}
