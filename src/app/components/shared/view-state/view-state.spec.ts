import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ViewStateComponent } from './view-state';

describe('ViewStateComponent', () => {
  let fixture: ComponentFixture<ViewStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ViewStateComponent] }).compileComponents();
    fixture = TestBed.createComponent(ViewStateComponent);
  });

  it('uses a polite live region for progress', () => {
    fixture.componentRef.setInput('state', 'loading');
    fixture.componentRef.setInput('message', 'Carregando dados...');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
  });

  it('uses alert semantics and emits retry for errors', () => {
    fixture.componentRef.setInput('state', 'loadError');
    fixture.componentRef.setInput('message', 'Falha ao carregar.');
    fixture.componentRef.setInput('retryAvailable', true);
    fixture.detectChanges();
    spyOn(fixture.componentInstance.retry, 'emit');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    fixture.nativeElement.querySelector('button').click();
    expect(fixture.componentInstance.retry.emit).toHaveBeenCalled();
  });

  it('exposes an optional recovery action with an accessible label', () => {
    fixture.componentRef.setInput('state', 'emptyPeriod');
    fixture.componentRef.setInput('message', 'Nenhum lançamento neste mês.');
    fixture.componentRef.setInput('actionLabel', 'Adicionar receita');
    fixture.detectChanges();
    spyOn(fixture.componentInstance.action, 'emit');
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.textContent).toContain('Adicionar receita');
    button.click();
    expect(fixture.componentInstance.action.emit).toHaveBeenCalled();
  });
});
