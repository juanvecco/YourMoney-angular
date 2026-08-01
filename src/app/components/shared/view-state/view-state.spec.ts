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
});
