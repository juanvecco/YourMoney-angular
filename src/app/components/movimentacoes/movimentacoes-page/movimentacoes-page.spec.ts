import { Subject, of } from 'rxjs';
import { MovimentacoesPageComponent } from './movimentacoes-page';
import { MovimentacaoService } from '../../../services/movimentacao';
import { ContaFinanceiraService } from '../../../services/conta';
import { FinancialNavigationContextService } from '../../../services/financial-navigation-context.service';
import { ConsultaMovimentacoesResponse } from '../../../models/movimentacao.model';

describe('MovimentacoesPageComponent', () => {
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
