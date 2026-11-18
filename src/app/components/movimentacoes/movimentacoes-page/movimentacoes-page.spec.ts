import { Subject, of } from 'rxjs';
import { MovimentacoesPageComponent } from './movimentacoes-page';
import { MovimentacaoService } from '../../../services/movimentacao';
import { ContaFinanceiraService } from '../../../services/conta';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';
import { ConsultaMovimentacoesResponse } from '../../../models/movimentacao.model';

describe('MovimentacoesPageComponent', () => {
  it('clears previous period totals while a new month loads', () => {
    const first = new Subject<ConsultaMovimentacoesResponse>();
    const second = new Subject<ConsultaMovimentacoesResponse>();
    const movimentacoes = jasmine.createSpyObj<MovimentacaoService>('MovimentacaoService', ['consultar']);
    movimentacoes.consultar.and.returnValues(first, second);
    const contas = jasmine.createSpyObj<ContaFinanceiraService>('ContaFinanceiraService', ['listarContas']);
    contas.listarContas.and.returnValue(of([]));
    const component = new MovimentacoesPageComponent(movimentacoes, contas, new FinancialNavigationContextService());

    component.ngOnInit();
    first.next({ itens: [{ id: '1' } as ConsultaMovimentacoesResponse['itens'][number]],
      pagina: 1, tamanhoPagina: 25, totalItens: 1, totalPaginas: 1,
      totais: { receitas: 100, despesas: 0, investimentos: 0, saldo: 100 } });
    component.selecionarPeriodo(new Date(2026, 6, 1));

    expect(component.estado).toBe('loading');
    expect(component.resposta.itens).toEqual([]);
    expect(component.totais.saldo).toBe(0);
    component.ngOnDestroy();
  });

  it('ignores stale responses after the period changes', () => {
    const first = new Subject<ConsultaMovimentacoesResponse>();
    const second = new Subject<ConsultaMovimentacoesResponse>();
    const movimentacoes = jasmine.createSpyObj<MovimentacaoService>('MovimentacaoService', ['consultar']);
    movimentacoes.consultar.and.returnValues(first, second);
    const contas = jasmine.createSpyObj<ContaFinanceiraService>('ContaFinanceiraService', ['listarContas']);
    contas.listarContas.and.returnValue(of([]));
    const context = new FinancialNavigationContextService();
    const component = new MovimentacoesPageComponent(movimentacoes, contas, context);

    component.ngOnInit();
    component.selecionarPeriodo(new Date(2026, 5, 1));
    second.next({ itens: [], pagina: 1, tamanhoPagina: 25, totalItens: 0, totalPaginas: 0,
      totais: { receitas: 20, despesas: 5, investimentos: 0, saldo: 15 } });
    first.next({ itens: [], pagina: 1, tamanhoPagina: 25, totalItens: 0, totalPaginas: 0,
      totais: { receitas: 999, despesas: 0, investimentos: 0, saldo: 999 } });

    expect(component.resposta.totais.saldo).toBe(15);
    component.ngOnDestroy();
  });
});
