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

  it('shows decorative summary placeholders only while initially loading', () => {
    fixture.componentRef.setInput('state', 'loading');
    fixture.componentRef.setInput('message', 'Carregando resumo...');
    fixture.componentRef.setInput('skeleton', 'summary');
    fixture.detectChanges();

    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toContain('Carregando resumo...');
    expect(status.querySelector('.ym-skeleton--summary[aria-hidden="true"]')).toBeTruthy();
    expect(status.querySelector('.ym-view-state__spinner')).toBeNull();

    fixture.componentRef.setInput('state', 'loadedWithData');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ym-skeleton')).toBeNull();
  });

  it('keeps refresh progress without covering existing data with a skeleton', () => {
    fixture.componentRef.setInput('state', 'refreshing');
    fixture.componentRef.setInput('message', 'Atualizando dados...');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ym-skeleton')).toBeNull();
    expect(fixture.nativeElement.querySelector('.ym-view-state__spinner')).toBeTruthy();
  });

  it('renders list and chart placeholders according to the requested variant', () => {
    fixture.componentRef.setInput('state', 'loading');
    fixture.componentRef.setInput('skeleton', 'list');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ym-skeleton--list')).toBeTruthy();

    fixture.componentRef.setInput('skeleton', 'chart');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ym-skeleton--chart')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.ym-skeleton--list')).toBeNull();

    fixture.componentRef.setInput('state', 'loadError');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ym-skeleton')).toBeNull();
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
