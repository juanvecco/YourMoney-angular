import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CategoriaService } from '../../../services/categoria';
import { FeedbackService } from '../../../services/feedback.service';
import { ContaFinanceiraService } from '../../../services/conta';
import { ConfiguracaoPageComponent } from './configuracao-page';
import { RegraNegocioService } from '../../../services/regra-negocio.service';

describe('ConfiguracaoPageComponent', () => {
  it('searches revenue and expense recurrence separately and restores a failed toggle', async () => {
    const regras = [
      { codigo: 'despesas.recorrencia', nome: 'Recorrência de despesas', descricao: 'Despesas mensais', grupo: 'Despesas', ativa: true, efetiva: true, dependencias: [] },
      { codigo: 'receitas.recorrencia', nome: 'Recorrência de receitas', descricao: 'Receitas mensais', grupo: 'Receitas', ativa: true, efetiva: true, dependencias: [] },
    ];
    const regraService = {
      carregar: () => of(regras), estaAtiva: () => true, regras: () => regras,
      atualizar: () => throwError(() => new Error('offline')),
    };
    await TestBed.configureTestingModule({
      imports: [ConfiguracaoPageComponent],
      providers: [
        { provide: CategoriaService, useValue: { listarCategorias: () => of([]) } },
        { provide: ContaFinanceiraService, useValue: { listarContas: () => of([]) } },
        { provide: FeedbackService, useValue: { confirm: () => Promise.resolve(false) } },
        { provide: RegraNegocioService, useValue: regraService },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfiguracaoPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.selecionarSecao('regras');
    component.buscaRegras = 'RECORRENCIA';
    fixture.detectChanges();
    expect(component.regrasFiltradas.map(item => item.codigo)).toEqual([
      'despesas.recorrencia', 'receitas.recorrencia',
    ]);
    component.alterarRegra(component.regras[0], false);
    expect(component.regras[0].ativa).toBeTrue();
    expect(component.erroRegras).toContain('Não foi possível salvar');
  });

  it('renders a single page heading and real category button', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracaoPageComponent],
      providers: [
        { provide: CategoriaService, useValue: { listarCategorias: () => of([]) } },
        { provide: ContaFinanceiraService, useValue: { listarContas: () => of([]) } },
        { provide: FeedbackService, useValue: { confirm: () => Promise.resolve(false) } },
        { provide: RegraNegocioService, useValue: { carregar: () => of([]), estaAtiva: () => true, regras: () => [] } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfiguracaoPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveSize(1);
    expect(Array.from(fixture.nativeElement.querySelectorAll('button')).some(
      (button: unknown) => (button as HTMLButtonElement).textContent?.includes('Nova categoria')
    )).toBeTrue();
  });
});
