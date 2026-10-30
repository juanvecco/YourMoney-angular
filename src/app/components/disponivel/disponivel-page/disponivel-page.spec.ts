import { of, throwError } from 'rxjs';
import { DisponivelPageComponent } from './disponivel-page';
import { MovimentacaoService } from '../../../services/movimentacao';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';

describe('DisponivelPageComponent', () => {
  let component: DisponivelPageComponent;
  let movimentacoes: jasmine.SpyObj<MovimentacaoService>;
  let context: FinancialNavigationContextService;

  beforeEach(() => {
    movimentacoes = jasmine.createSpyObj<MovimentacaoService>('MovimentacaoService', ['consultar']);
    context = new FinancialNavigationContextService();
    context.setPeriod(new Date(2026, 4, 1));
    movimentacoes.consultar.and.returnValue(of({
      itens: [], pagina: 1, tamanhoPagina: 10, totalItens: 2, totalPaginas: 1,
      totais: { receitas: 3000, despesas: 1200, investimentos: 400, saldo: 1800 },
    }));
    component = new DisponivelPageComponent(movimentacoes, context);
    component.ngOnInit();
  });

  it('uses the authoritative activity totals for the selected period', () => {
    expect(movimentacoes.consultar).toHaveBeenCalledWith({
      mesInicial: '2026-05', mesFinal: '2026-05', pagina: 1, tamanhoPagina: 10,
    });
    expect(component.resumo.saldo).toBe(1800);
    expect(component.resumo.investimentos).toBe(400);
    expect(component.estadoDaPagina).toBe('loadedWithData');
  });

  it('clears stale totals and exposes a recoverable load error', () => {
    movimentacoes.consultar.and.returnValue(throwError(() => new Error('falha')));
    component.carregarDados();

    expect(component.resumo).toEqual({ receitas: 0, despesas: 0, investimentos: 0, saldo: 0 });
    expect(component.estadoDaPagina).toBe('loadError');
    expect(component.mensagemCarregamento).toContain('Não foi possível');
  });
});
