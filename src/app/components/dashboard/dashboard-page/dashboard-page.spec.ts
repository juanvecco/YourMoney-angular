import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardPageComponent } from './dashboard-page';
import { ReceitaService } from '../../../services/receita';
import { DespesaService } from '../../../services/despesa';
import { InvestimentoService } from '../../../services/investimento';
import { AuthService } from '../../../services/auth.service';

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let component: DashboardPageComponent;
  let receitaService: jasmine.SpyObj<ReceitaService>;
  let despesaService: jasmine.SpyObj<DespesaService>;
  let investimentoService: jasmine.SpyObj<InvestimentoService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    receitaService = jasmine.createSpyObj<ReceitaService>('ReceitaService', ['obterPorReferencia']);
    despesaService = jasmine.createSpyObj<DespesaService>('DespesaService', ['obterPorReferencia', 'listarCategorias']);
    investimentoService = jasmine.createSpyObj<InvestimentoService>('InvestimentoService', ['obterPorReferencia']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'createUrlTree', 'serializeUrl'], { events: of() });
    router.createUrlTree.and.returnValue({} as ReturnType<Router['createUrlTree']>);
    router.serializeUrl.and.returnValue('/');

    receitaService.obterPorReferencia.and.returnValue(of([]));
    despesaService.obterPorReferencia.and.returnValue(of([]));
    despesaService.listarCategorias.and.returnValue(of([]));
    investimentoService.obterPorReferencia.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
        { provide: ReceitaService, useValue: receitaService },
        { provide: DespesaService, useValue: despesaService },
        { provide: InvestimentoService, useValue: investimentoService },
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPageComponent);
    component = fixture.componentInstance;
  });

  it('maps positive monthly totals into chart items', () => {
    const resumo = component.criarResumoGrafico(
      [
        {
          id: 'receita-1',
          descricao: 'Salario',
          valor: 5000,
          data: '2026-05-01',
          natureza: 'RendaDisponivel',
          consideraNasMetas: true,
          valorAbatidoEmDespesa: 0
        }
      ],
      [
        {
          id: 'despesa-1',
          descricao: 'Mercado',
          valor: 1200,
          data: '2026-05-02',
          idContaFinanceira: 'conta-1',
          idCategoria: 'categoria-1'
        }
      ],
      [
        {
          id: 'investimento-1',
          nome: 'Tesouro',
          descricao: 'Tesouro direto',
          tipo: 'Renda fixa',
          quantidade: 1,
          precoMedio: 1000,
          valorAtual: 1500,
          dataInvestimento: '2026-05-03T00:00:00',
          dataResgate: '2026-12-03T00:00:00',
          ativo: true
        }
      ],
      new Date(2026, 4, 1)
    );

    expect(resumo.estado).toBe('pronto');
    expect(resumo.periodoReferencia.mes).toBe(5);
    expect(resumo.periodoReferencia.ano).toBe(2026);
    expect(resumo.items.map(item => item.id)).toEqual(['receitas', 'despesas', 'investimentos', 'saldo']);
    expect(resumo.items.find(item => item.id === 'saldo')?.valor).toBe(3800);
  });

  it('recalculates chart data when the dashboard month changes', () => {
    component.mesAtual = new Date(2026, 4, 1);
    fixture.detectChanges();

    component.proximoMes();

    expect(receitaService.obterPorReferencia).toHaveBeenCalledWith(6, 2026);
    expect(despesaService.obterPorReferencia).toHaveBeenCalledWith(6, 2026);
    expect(investimentoService.obterPorReferencia).toHaveBeenCalledWith(6, 2026);
  });

  it('returns an empty state when the period has no chartable values', () => {
    const resumo = component.criarResumoGrafico([], [], [], new Date(2026, 4, 1));

    expect(resumo.estado).toBe('vazio');
    expect(resumo.items.length).toBe(0);
    expect(resumo.mensagemEstado).toContain('Nenhum dado financeiro');
  });

  it('shows error state text when a required chart source fails', () => {
    spyOn(console, 'error');
    receitaService.obterPorReferencia.and.returnValue(throwError(() => new Error('falha')));

    fixture.detectChanges();

    expect(component.resumoGrafico.estado).toBe('erro');
    expect(component.resumoGrafico.mensagemEstado).toContain('Nao foi possivel');
  });

  it('renders chart state text and legend markup for responsive layout', () => {
    receitaService.obterPorReferencia.and.returnValue(of([
      {
        id: 'receita-1',
        descricao: 'Salario',
        valor: 3000,
        data: '2026-05-01',
        natureza: 'RendaDisponivel',
        consideraNasMetas: true,
        valorAbatidoEmDespesa: 0
      }
    ]));

    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('.ym-chart-card')).not.toBeNull();
    expect(nativeElement.querySelector('.ym-chart-legend')).not.toBeNull();
    expect(nativeElement.textContent).toContain('Receitas');
  });

  it('logs out before navigating to login', () => {
    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('renders an accessible logout action', () => {
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const logoutButton = nativeElement.querySelector('button[aria-label="Sair da conta"]');

    expect(logoutButton).not.toBeNull();
    expect(logoutButton?.textContent).toContain('Sair');
  });
});
