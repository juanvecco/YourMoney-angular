import { Page, Route } from '@playwright/test';
import { test as authTest } from './auth.fixture';

type ApiFixtures = {
  mockApi: () => Promise<void>;
};

function responseFor(url: string): unknown {
  const path = new URL(url).pathname.toLowerCase();
  if (path.includes('/metas/resumo')) return {
    mesReferencia: '2026-07-01', receitaTotal: 0, receitaTotalBruta: 0, receitaElegivelMetas: 0,
    receitaExcluidaMetas: 0, despesaTotal: 0, despesaTotalBruta: 0, despesaTotalReembolsada: 0,
    percentualTotalComprometido: 0, valorTotalReservado: 0, percentualRestante: 0,
    valorRestanteAntesDespesas: 0, saldoFinal: 0, valorFaltante: 0, status: 'zerado', alertas: [], metas: []
  };
  if (path.includes('/investimento/consolidado')) return { investimentos: [], reservas: [], totalInvestimentos: 0 };
  if (path.includes('/despesas/consulta')) return {
    itens: [], paginaAtual: 1, tamanhoPagina: 10, totalPaginas: 0, totalResultados: 0,
    valorTotalFiltrado: 0, totaisPorConta: []
  };
  if (path.includes('/receitasrecorrentes/reserva-emergencia')) return { itens: [] };
  if (path.includes('/receitasrecorrentes/elegiveis-para-investimento')) return { itens: [] };
  if (path.includes('/receitasrecorrentes') || path.includes('/despesasrecorrentes')) return { itens: [] };
  if (path.includes('/disponivel')) return { totalReceitas: 0, totalDespesas: 0, saldoDisponivel: 0 };
  if (path.includes('/identidade/autenticar')) {
    return { accessToken: 'e2e-token', expiresIn: 3600, usuarioToken: { id: 'e2e', email: 'e2e@example.test', claims: [] } };
  }
  return [];
}

async function fulfillApi(route: Route): Promise<void> {
  if (route.request().method() === 'DELETE') {
    await route.fulfill({ status: 204 });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responseFor(route.request().url())) });
}

export const test = authTest.extend<ApiFixtures>({
  mockApi: async ({ page }: { page: Page }, use) => {
    await use(async () => page.route('**/api/**', fulfillApi));
  },
});

export { expect } from '@playwright/test';
