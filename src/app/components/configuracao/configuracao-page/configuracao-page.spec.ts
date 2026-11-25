import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CategoriaService } from '../../../services/categoria';
import { FeedbackService } from '../../../services/feedback.service';
import { ContaFinanceiraService } from '../../../services/conta';
import { ConfiguracaoPageComponent } from './configuracao-page';
import { RegraNegocioService } from '../../../services/regra-negocio.service';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

describe('ConfiguracaoPageComponent', () => {
  it('opens the accounts section from the getting started link', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracaoPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ secao: 'contas' }) } } },
        { provide: CategoriaService, useValue: { listarCategorias: () => of([]) } },
        { provide: ContaFinanceiraService, useValue: { listarContas: () => of([]) } },
        { provide: FeedbackService, useValue: { confirm: () => Promise.resolve(false) } },
        { provide: RegraNegocioService, useValue: { carregar: () => of([]), estaAtiva: () => true, regras: () => [] } },
        { provide: AuthService, useValue: { getExternalAccountLinkStatus: () => of({ googleAvailable: true, googleLinked: false }) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfiguracaoPageComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.secao).toBe('contas');
    expect(fixture.nativeElement.textContent).toContain('Esta conta organiza seus lançamentos');
  });

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
        { provide: AuthService, useValue: { getExternalAccountLinkStatus: () => of({ googleAvailable: true, googleLinked: false }) } },
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
        { provide: AuthService, useValue: { getExternalAccountLinkStatus: () => of({ googleAvailable: true, googleLinked: false }) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfiguracaoPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveSize(1);
    expect(Array.from(fixture.nativeElement.querySelectorAll('button')).some(
      (button: unknown) => (button as HTMLButtonElement).textContent?.includes('Nova categoria')
    )).toBeTrue();
  });

  it('reviews the masked Google identity and updates the current account after explicit confirmation', async () => {
    const auth = {
      getExternalAccountLinkStatus: jasmine.createSpy('getExternalAccountLinkStatus')
        .and.returnValue(of({ googleAvailable: true, googleLinked: false })),
      getPendingGoogleLink: jasmine.createSpy('getPendingGoogleLink')
        .and.returnValue(of({ provider: 'google' as const, emailMasked: 'm***@example.com', expiresAt: '2026-11-25T12:00:00Z' })),
      confirmGoogleLink: jasmine.createSpy('confirmGoogleLink')
        .and.returnValue(of({ googleAvailable: true, googleLinked: true })),
    };
    await TestBed.configureTestingModule({
      imports: [ConfiguracaoPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ secao: 'seguranca', google: 'pendente' }) } } },
        { provide: CategoriaService, useValue: { listarCategorias: () => of([]) } },
        { provide: ContaFinanceiraService, useValue: { listarContas: () => of([]) } },
        { provide: FeedbackService, useValue: { confirm: () => Promise.resolve(false) } },
        { provide: RegraNegocioService, useValue: { carregar: () => of([]), estaAtiva: () => true, regras: () => [] } },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfiguracaoPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('m***@example.com');
    expect(fixture.nativeElement.textContent).toContain('Confirmar conexão');
    fixture.componentInstance.confirmarVinculoGoogle();
    fixture.detectChanges();
    expect(auth.confirmGoogleLink).toHaveBeenCalled();
    expect(fixture.componentInstance.googleLinkStatus?.googleLinked).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Google conectado à sua conta YourMoney');
  });

  it('cancels a pending Google review without changing the existing access methods', async () => {
    const auth = {
      getExternalAccountLinkStatus: () => of({ googleAvailable: true, googleLinked: false }),
      getPendingGoogleLink: () => of({ provider: 'google' as const, emailMasked: 'm***@example.com', expiresAt: '2026-11-25T12:00:00Z' }),
      cancelGoogleLink: jasmine.createSpy('cancelGoogleLink').and.returnValue(of(void 0)),
    };
    await TestBed.configureTestingModule({
      imports: [ConfiguracaoPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ secao: 'seguranca', google: 'pendente' }) } } },
        { provide: CategoriaService, useValue: { listarCategorias: () => of([]) } },
        { provide: ContaFinanceiraService, useValue: { listarContas: () => of([]) } },
        { provide: FeedbackService, useValue: { confirm: () => Promise.resolve(false) } },
        { provide: RegraNegocioService, useValue: { carregar: () => of([]), estaAtiva: () => true, regras: () => [] } },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfiguracaoPageComponent);
    fixture.detectChanges();
    fixture.componentInstance.cancelarVinculoGoogle();
    fixture.detectChanges();
    expect(auth.cancelGoogleLink).toHaveBeenCalled();
    expect(fixture.componentInstance.googleLinkStatus?.googleLinked).toBeFalse();
    expect(fixture.componentInstance.googleLinkPendente).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Conexão cancelada. Sua conta não foi alterada.');
  });
});
