import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header';

@Component({ standalone: true, imports: [PageHeaderComponent], template: `<app-page-header eyebrow="Visão geral" heading="Dashboard" description="Resumo financeiro"><button pageHeaderActions>Atualizar</button></app-page-header>` })
class HostComponent {}

describe('PageHeaderComponent', () => {
  it('renders one h1, supporting text and projected actions', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveSize(1);
    expect(fixture.nativeElement.textContent).toContain('Visão geral');
    expect(fixture.nativeElement.textContent).toContain('Resumo financeiro');
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Atualizar');
  });
});
