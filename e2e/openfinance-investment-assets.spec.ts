import { Route } from '@playwright/test';
import { expect, test } from './fixtures/api.fixture';

test('shows Pluggy investment positions only and leaves the local portfolio unchanged', async ({
  page, mockApi, authenticateAs, userA,
}) => {
  await mockApi();
  await authenticateAs(userA);

  const bankTransactionRequests: string[] = [];
  await page.route('**/api/OpenFinance/investments/preview**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        generatedAt: '2026-10-30T10:00:00Z',
        connections: [{
          connectionId: 'connection-1', institutionName: 'Banco Exemplo',
          hasInvestmentProduct: true, status: 'current', lastAttemptAt: '2026-10-30T10:00:00Z',
          lastSuccessAt: '2026-10-30T10:00:00Z', nextRefreshAt: '2026-10-31T10:00:00Z',
          message: null, assetCount: 1,
        }],
        assets: [{
          investmentId: 'asset-1', itemId: 'item-1', connectionId: 'connection-1',
          institutionName: 'Banco Exemplo', name: 'CDB Banco Exemplo', type: 'CDB',
          subtype: 'Prefixado', code: null, isin: null, balance: 120, currencyCode: 'BRL',
          quantity: 10, currentUnitQuote: 12, originalAmount: 100,
          positionDate: '2026-10-30T00:00:00Z', purchaseDate: null,
          issuer: 'Banco Exemplo', issuerCnpj: null, status: 'ACTIVE',
          sourceUpdatedAt: '2026-10-30T09:00:00Z', snapshotToken: 'snapshot-1',
          isStale: false, canReconcile: true, reconcileUnavailableReason: null,
          linkedInvestmentId: null, linkedInvestmentName: null, candidates: [],
        }],
      }),
    });
  });
  await page.route('**/api/OpenFinance/real-transactions/**', async (route: Route) => {
    bankTransactionRequests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transactions: [{ description: 'COMPRA CDB VIA CONTA', amount: 120 }] }),
    });
  });

  await page.goto('/investimento', { waitUntil: 'domcontentloaded' });
  const total = page.getByRole('heading', { name: 'Total investido' }).locator('..');
  await expect(total).toContainText('R$ 0,00');
  await expect(page.getByText('CDB Banco Exemplo', { exact: true })).toHaveCount(0);

  await page.getByRole('checkbox', { name: 'Mostrar ativos Open Finance' }).check();
  const openFinanceSection = page.locator('.ym-openfinance-investments');
  await expect(page.getByText('CDB Banco Exemplo', { exact: true })).toBeVisible();
  await expect(openFinanceSection.getByText('Quantidade')).toBeVisible();
  await expect(openFinanceSection.getByText('Cotação unitária', { exact: true })).toBeVisible();
  await expect(openFinanceSection).toContainText('próxima atualização após');
  await expect(page.getByText('COMPRA CDB VIA CONTA')).toHaveCount(0);
  await expect(total).toContainText('R$ 0,00');
  expect(bankTransactionRequests).toEqual([]);
});

test('requires explicit confirmation to link, replace or create an investment position', async ({
  page, mockApi, authenticateAs, userA,
}) => {
  await mockApi();
  await authenticateAs(userA);

  const localInvestments: Record<string, unknown>[] = [
    {
      id: 'investment-link', nome: 'CDB já cadastrado', descricao: 'Aplicação manual', tipo: 'CDB',
      quantidade: 10, precoMedio: 9, valorAtual: 90, dataInvestimento: '2026-01-01T00:00:00',
      mesReferencia: '2026-01-01T00:00:00', dataResgate: null, ativo: true,
      receitaRecorrenteId: null, reservaAssociada: null, grupoObjetivoId: null,
      grupoObjetivo: null, tipoAtivo: 'RendaFixa',
    },
    {
      id: 'investment-replace', nome: 'Fundo já cadastrado', descricao: 'Carteira local', tipo: 'Fundo',
      quantidade: 2, precoMedio: 20, valorAtual: 40, dataInvestimento: '2026-02-01T00:00:00',
      mesReferencia: '2026-02-01T00:00:00', dataResgate: null, ativo: true,
      receitaRecorrenteId: null, reservaAssociada: null, grupoObjetivoId: null,
      grupoObjetivo: null, tipoAtivo: 'FundoInvestimento',
    },
  ];
  const candidate = (investmentId: string, name: string, value: number) => ({
    investmentId, name, type: 'CDB', code: null, isin: null, reason: 'Nome e tipo compatíveis',
    canReplace: true, cannotReplaceReason: null, descricao: 'Cadastro manual', quantidade: 2,
    precoMedio: 20, valorAtual: value, dataInvestimento: '2026-02-01T00:00:00',
    mesReferencia: '2026-02-01T00:00:00', receitaRecorrenteId: null,
    grupoObjetivoId: null, tipoAtivo: 'RendaFixa', precoUnitarioAtual: null,
  });
  const positions = [
    {
      investmentId: 'external-link', name: 'CDB correspondente', type: 'CDB', subtype: null,
      balance: 90, quantity: 10, currentUnitQuote: 9, originalAmount: 80,
      candidates: [candidate('investment-link', 'CDB já cadastrado', 90)],
    },
    {
      investmentId: 'external-create', name: 'Tesouro novo', type: 'Tesouro', subtype: 'Selic',
      balance: 88, quantity: 8, currentUnitQuote: 11, originalAmount: 80, candidates: [],
    },
    {
      investmentId: 'external-replace', name: 'Fundo atualizado', type: 'Fundo', subtype: null,
      balance: 60, quantity: 3, currentUnitQuote: 20, originalAmount: 54,
      candidates: [candidate('investment-replace', 'Fundo já cadastrado', 40)],
    },
  ];
  const links = new Map<string, string>();
  const requests: Record<string, unknown>[] = [];

  await page.route('**/api/Investimento/consolidado**', async route => {
    const total = localInvestments.reduce((sum, item) => sum + Number(item['valorAtual'] ?? 0), 0);
    await route.fulfill({ json: {
      totalInvestido: total, totalFiltrado: total, itens: localInvestments,
      reservas: [], subtotaisPorGrupo: [], subtotaisPorTipoAtivo: [],
    } });
  });
  await page.route('**/api/OpenFinance/investments/preview**', async (route: Route) => {
    await route.fulfill({ json: {
      generatedAt: '2026-10-30T10:00:00Z',
      connections: [{
        connectionId: 'connection-1', institutionName: 'Banco Exemplo', hasInvestmentProduct: true,
        status: 'current', lastAttemptAt: '2026-10-30T10:00:00Z', lastSuccessAt: '2026-10-30T10:00:00Z',
        nextRefreshAt: '2026-10-31T10:00:00Z', message: null, assetCount: positions.length,
      }],
      assets: positions.map(position => ({
        ...position, itemId: 'item-1', connectionId: 'connection-1', institutionName: 'Banco Exemplo',
        code: null, isin: null, currencyCode: 'BRL', positionDate: '2026-10-30T00:00:00Z',
        purchaseDate: null, issuer: null, issuerCnpj: null, status: 'ACTIVE', sourceUpdatedAt: null,
        snapshotToken: 'snapshot-1', isStale: false, canReconcile: true,
        reconcileUnavailableReason: null,
        linkedInvestmentId: links.get(position.investmentId) ?? null,
        linkedInvestmentName: links.has(position.investmentId) ? 'Ativo local vinculado' : null,
      })),
    } });
  });
  await page.route('**/api/OpenFinance/investments/reconcile', async (route: Route) => {
    const request = route.request().postDataJSON() as Record<string, unknown>;
    requests.push(request);
    const externalId = String(request['externalInvestmentId']);
    const action = String(request['action']);
    const targetId = String(request['targetInvestmentId'] ?? `investment-created-${requests.length}`);
    links.set(externalId, targetId);
    if (action === 'create') {
      const investment = request['investment'] as Record<string, unknown>;
      localInvestments.push({
        ...investment, id: targetId, dataResgate: null, ativo: true,
        grupoObjetivo: null, reservaAssociada: null,
      });
    } else if (action === 'replace') {
      const index = localInvestments.findIndex(item => item['id'] === targetId);
      if (index >= 0) localInvestments[index] = {
        ...localInvestments[index], ...(request['investment'] as Record<string, unknown>), id: targetId,
      };
    }
    await route.fulfill({ json: {
      externalInvestmentId: externalId, action, investmentId: targetId, registeredAt: '2026-10-30T10:00:00Z',
    } });
  });

  await page.goto('/investimento', { waitUntil: 'domcontentloaded' });
  await page.getByRole('checkbox', { name: 'Mostrar ativos Open Finance' }).check();

  const linkCard = page.locator('.ym-openfinance-asset').filter({ hasText: 'CDB correspondente' });
  await linkCard.getByRole('button', { name: 'Manter e vincular' }).click();
  await page.getByRole('button', { name: 'Manter e vincular', exact: true }).click();
  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(linkCard.getByText(/Já vinculada/)).toBeVisible();
  expect(localInvestments[0]['valorAtual']).toBe(90);

  const createCard = page.locator('.ym-openfinance-asset').filter({ hasText: 'Tesouro novo' });
  await createCard.getByRole('button', { name: 'Cadastrar ativo preenchido' }).click();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Tesouro novo');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(requests).toHaveLength(1);
  await createCard.getByRole('button', { name: 'Cadastrar ativo preenchido' }).click();
  await page.getByLabel('Data do investimento').fill('2026-10-01');
  await page.getByRole('button', { name: 'Salvar Investimento' }).click();
  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(createCard.getByText(/Já vinculada/)).toBeVisible();
  expect(requests[1]).toMatchObject({ externalInvestmentId: 'external-create', action: 'create' });
  expect(localInvestments.some(item => item['nome'] === 'Tesouro novo')).toBe(true);

  const replaceCard = page.locator('.ym-openfinance-asset').filter({ hasText: 'Fundo atualizado' });
  await replaceCard.getByRole('button', { name: 'Revisar e atualizar' }).click();
  await expect(page.getByText('Revisar atualização da posição')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(requests).toHaveLength(2);
  await replaceCard.getByRole('button', { name: 'Revisar e atualizar' }).click();
  await page.getByRole('button', { name: 'Salvar Investimento' }).click();
  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(replaceCard.getByText(/Já vinculada/)).toBeVisible();
  expect(requests[2]).toMatchObject({
    externalInvestmentId: 'external-replace', action: 'replace', targetInvestmentId: 'investment-replace',
  });
  expect(requests.map(request => request['action'])).toEqual(['link', 'create', 'replace']);
});
