import { Page, Route } from '@playwright/test';
import { test as authTest } from './auth.fixture';

type ApiFixtures = {
  mockApi: () => Promise<void>;
};

export type AssetTypeCode =
  | 'FundoInvestimento'
  | 'Exterior'
  | 'Criptomoeda'
  | 'RendaFixa'
  | 'Acoes'
  | 'Outros';

export interface OrganizationGroupFixture {
  id: string;
  nome: string;
  versao: string;
  quantidadeInvestimentos: number;
}

export function organizationGroupFixture(
  overrides: Partial<OrganizationGroupFixture> = {}
): OrganizationGroupFixture {
  return {
    id: 'grupo-reserva',
    nome: 'Reserva de emergência',
    versao: 'AQIDBA==',
    quantidadeInvestimentos: 0,
    ...overrides,
  };
}

export function organizationInvestmentFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'investimento-reserva',
    nome: 'Tesouro Selic',
    descricao: 'Reserva de emergência',
    tipo: 'Tesouro Selic 2029',
    quantidade: 1,
    precoMedio: 100,
    valorAtual: 100,
    dataInvestimento: '2026-08-01T00:00:00',
    mesReferencia: '2026-08-01T00:00:00',
    dataResgate: null,
    ativo: true,
    receitaRecorrenteId: null,
    reservaAssociada: null,
    grupoObjetivoId: 'grupo-reserva',
    grupoObjetivo: { id: 'grupo-reserva', nome: 'Reserva de emergência' },
    tipoAtivo: 'RendaFixa' satisfies AssetTypeCode,
    ...overrides,
  };
}

export function consolidatedOrganizationFixture(
  investments: Record<string, unknown>[] = []
): Record<string, unknown> {
  const total = investments.reduce((sum, item) => sum + Number(item['valorAtual'] ?? 0), 0);
  return {
    totalInvestido: total,
    totalFiltrado: total,
    itens: investments,
    reservas: [],
    subtotaisPorGrupo: [],
    subtotaisPorTipoAtivo: [],
  };
}

export function financialActivityFixture(): Record<string, unknown> {
  return {
    itens: [
      { id: 'receita-e2e', tipo: 'receita', descricao: 'Salário', data: '2026-07-05',
        mesReferencia: '2026-07', valor: 3000, contaFinanceiraId: 'conta-e2e',
        contaFinanceiraNome: 'Conta principal', categoria: null, rotaOrigem: '/receitas' },
      { id: 'despesa-e2e', tipo: 'despesa', descricao: 'Moradia', data: '2026-07-10',
        mesReferencia: '2026-07', valor: 1200, contaFinanceiraId: 'conta-e2e',
        contaFinanceiraNome: 'Conta principal', categoria: 'Casa', rotaOrigem: '/despesas' },
    ],
    pagina: 1, tamanhoPagina: 25, totalItens: 2, totalPaginas: 1,
    totais: { receitas: 3000, despesas: 1200, investimentos: 400, saldo: 1800 },
  };
}

function responseFor(url: string): unknown {
  const parsed = new URL(url);
  const path = parsed.pathname.toLowerCase();
  if (path.includes('/movimentacoes')) return financialActivityFixture();
  if (path.endsWith('/carteiras')) return [
    { id: 'wallet-principal', nome: 'Minha carteira', principal: true },
    { id: 'wallet-esposa', nome: 'Carteira da esposa', principal: false },
  ];
  if (path.endsWith('/openfinance/sources')) return {
    readiness: { mode: 'preview-only', realDataEnabled: false, summary: 'Teste', nextSteps: [] },
    sources: [],
  };
  if (path.endsWith('/openfinance/pluggy-configuration')) return {
    configured: true, source: 'database', clientIdHint: 'cl••••d', updatedAt: null, canSave: true,
  };
  if (path.endsWith('/openfinance/connections')) return parsed.searchParams.get('carteiraId') === 'wallet-esposa'
    ? [{ id: 'connection-wife', institutionName: 'Banco da esposa', status: 'UPDATED', isSandbox: false,
        lastUpdatedAt: '2026-10-30T12:00:00Z', consentExpiresAt: null, connectedAt: '2026-10-01T12:00:00Z' }]
    : [];
  if (path.includes('/openfinance/real-transactions/overview')) return {
    generatedAt: '2026-10-30T12:00:00Z', sourceUpdatedAt: null,
    accounts: [], balancesByCurrencyAndType: [], transactions: [],
  };
  if (path.includes('/contafinanceira')) return parsed.searchParams.get('carteiraId') === 'wallet-esposa' ? [] : [
    { id: 'conta-e2e', descricao: 'Conta principal', dataCriacao: '2026-01-01', podeRemover: false, carteiraId: 'wallet-principal' }
  ];
  if (path.includes('/metas/resumo')) return {
    mesReferencia: '2026-07-01', receitaTotal: 0, receitaTotalBruta: 0, receitaElegivelMetas: 0,
    receitaExcluidaMetas: 0, despesaTotal: 0, despesaTotalBruta: 0, despesaTotalReembolsada: 0,
    percentualTotalComprometido: 0, valorTotalReservado: 0, percentualRestante: 0,
    valorRestanteAntesDespesas: 0, saldoFinal: 0, valorFaltante: 0, status: 'zerado', alertas: [], metas: []
  };
  if (path.includes('/investimento/consolidado')) return consolidatedOrganizationFixture();
  if (path.includes('/investimentogrupos')) return [];
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
  const url = new URL(route.request().url());
  if (url.pathname.toLowerCase().endsWith('/openfinance/connect-token') && route.request().method() === 'POST') {
    await route.fulfill({ status: 503, contentType: 'application/json', json: { message: 'Credenciais desta carteira precisam ser atualizadas.' } });
    return;
  }
  if (url.pathname.toLowerCase().endsWith('/carteiras') && route.request().method() === 'GET') {
    const isUserB = route.request().headers()['authorization'] === 'Bearer e2e-token-bruno';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(isUserB
        ? [{ id: 'wallet-bruno', nome: 'Minha carteira', principal: true }]
        : [
            { id: 'wallet-principal', nome: 'Minha carteira', principal: true },
            { id: 'wallet-esposa', nome: 'Carteira da esposa', principal: false },
          ]),
    });
    return;
  }
  if (url.pathname.toLowerCase().endsWith('/contafinanceira') && route.request().method() === 'POST') {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: {
      id: 'conta-manual-e2e', descricao: body['descricao'], carteiraId: body['carteiraId'],
      dataCriacao: '2026-10-30', podeRemover: true,
    } });
    return;
  }
  if (url.pathname.toLowerCase().endsWith('/carteira') && route.request().method() === 'PUT') {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ json: { id: 'conta-e2e', descricao: 'Conta principal', carteiraId: body['carteiraId'], podeRemover: false } });
    return;
  }
  if (route.request().method() === 'DELETE') {
    await route.fulfill({ status: 204 });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responseFor(route.request().url())) });
}

export const test = authTest.extend<ApiFixtures>({
  mockApi: async ({ page }: { page: Page }, use) => {
    await use(async () => page.route(url => {
      try {
        return new URL(url).pathname.toLowerCase().includes('/api/');
      } catch {
        return false;
      }
    }, fulfillApi));
  },
});

export { expect } from '@playwright/test';
