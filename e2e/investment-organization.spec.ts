import { Route } from '@playwright/test';
import { expect, test, consolidatedOrganizationFixture, organizationGroupFixture, organizationInvestmentFixture } from './fixtures/api.fixture';

test('creates objectives, associates organization and filters authoritative totals', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi();
  await authenticateAs(userA);
  const groups = [organizationGroupFixture({ id: 'g1', nome: 'Reserva', quantidadeInvestimentos: 1 })];
  let investmentPayload: any;

  await page.route('**/api/InvestimentoGrupos**', async (route: Route) => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ json: groups });
    if (request.method() === 'POST' && !request.url().endsWith('/exclusao')) {
      const body = request.postDataJSON();
      const created = organizationGroupFixture({ id: 'g2', nome: body.nome, versao: 'Ag==' });
      groups.push(created);
      return route.fulfill({ status: 201, json: created });
    }
    return route.fulfill({ status: 204 });
  });
  await page.route('**/api/Investimento/consolidado**', async route => {
    const url = new URL(route.request().url());
    const filtered = url.searchParams.has('grupoObjetivoId') || url.searchParams.has('semGrupo') || url.searchParams.has('tipoAtivo') || url.searchParams.has('naoClassificado');
    const investment = organizationInvestmentFixture({
      ...(url.searchParams.has('semGrupo') ? { grupoObjetivoId: null, grupoObjetivo: null } : {}),
      ...(url.searchParams.has('naoClassificado') ? { tipoAtivo: null } : {}),
    });
    const response = consolidatedOrganizationFixture(filtered ? [investment] : [investment, organizationInvestmentFixture({ id: 'i2', valorAtual: 250 })]);
    response['totalInvestido'] = 350;
    response['totalFiltrado'] = filtered ? 100 : 350;
    response['subtotaisPorGrupo'] = filtered
      ? [{ grupoObjetivoId: url.searchParams.has('semGrupo') ? null : 'g1', nome: url.searchParams.has('semGrupo') ? 'Sem grupo' : 'Reserva', quantidadeInvestimentos: 1, valorAtual: 100 }]
      : [
          { grupoObjetivoId: 'g1', nome: 'Reserva', quantidadeInvestimentos: 1, valorAtual: 100 },
          { grupoObjetivoId: null, nome: 'Sem grupo', quantidadeInvestimentos: 1, valorAtual: 250 },
        ];
    response['subtotaisPorTipoAtivo'] = [{ tipoAtivo: 'RendaFixa', nome: 'Renda fixa', quantidadeInvestimentos: 1, valorAtual: 100 }];
    await route.fulfill({ json: response });
  });
  await page.route('**/api/Investimento', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    investmentPayload = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: organizationInvestmentFixture(investmentPayload) });
  });

  await page.goto('/investimento', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('R$ 350,00')).toBeVisible();
  await expect(page.getByText('28,6%')).toBeVisible();
  await expect(page.getByText('71,4%')).toBeVisible();

  const manageObjectives = page.getByRole('button', { name: 'Gerenciar objetivos' });
  await manageObjectives.click();
  await expect(page.getByLabel('Nome do novo objetivo')).toBeFocused();
  await page.getByLabel('Nome do novo objetivo').fill('Viver de renda');
  await page.getByRole('button', { name: 'Criar objetivo' }).click();
  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(manageObjectives).toBeFocused();
  await expect(page.getByLabel('Objetivo financeiro').locator('option[value="g2"]')).toHaveText('Viver de renda');

  await page.getByRole('button', { name: 'Novo investimento' }).first().click();
  await page.getByLabel('Nome', { exact: true }).fill('ETF internacional');
  await page.getByLabel('Descrição').fill('Longo prazo');
  await page.getByLabel('Produto ou modalidade').fill('IVVB11');
  await page.getByLabel('Objetivo financeiro (opcional)').selectOption({ label: 'Viver de renda' });
  await page.getByLabel('Tipo de ativo (opcional)').selectOption({ label: 'Investimento no exterior' });
  await page.getByLabel('Quantidade').fill('1');
  await page.getByLabel('Preço médio (R$)').fill('100');
  await page.getByLabel('Valor (R$)').fill('110');
  await page.getByRole('button', { name: 'Salvar Investimento' }).click();
  await page.getByRole('button', { name: 'Entendi' }).click();
  expect(investmentPayload).toMatchObject({ tipo: 'IVVB11', grupoObjetivoId: 'g2', tipoAtivo: 'Exterior' });
  expect(investmentPayload.usuarioId).toBeUndefined();

  await page.getByLabel('Objetivo financeiro', { exact: true }).selectOption('semGrupo');
  await page.getByLabel('Tipo de ativo', { exact: true }).selectOption('RendaFixa');
  await expect(page.getByRole('heading', { name: 'Total filtrado' }).locator('..').getByText('R$ 100,00', { exact: true })).toBeVisible();
  await expect(page.locator('.ym-organization-chips').getByText('Sem grupo')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page.getByText('R$ 350,00')).toBeVisible();
});

test('keeps objective groups isolated when the authenticated user changes', async ({ page, mockApi, userA, userB }) => {
  await mockApi();
  await page.route('**/api/InvestimentoGrupos**', async route => {
    const authorization = route.request().headers()['authorization'] ?? '';
    const group = authorization.includes(userB.token)
      ? organizationGroupFixture({ id: 'bruno', nome: 'Objetivo do Bruno' })
      : organizationGroupFixture({ id: 'ana', nome: 'Objetivo da Ana' });
    await route.fulfill({ json: [group] });
  });

  await page.goto('/');
  await page.evaluate(user => {
    localStorage.setItem('access_token', user.token);
    localStorage.setItem('user_email', user.email);
    localStorage.setItem('username', user.username);
    localStorage.setItem('expires_at', String(Date.now() + 3_600_000));
  }, userA);
  await page.goto('/investimento');
  await page.getByRole('button', { name: 'Gerenciar objetivos' }).click();
  const groupList = page.getByLabel('Objetivos financeiros cadastrados');
  await expect(groupList.getByText('Objetivo da Ana', { exact: true })).toBeVisible();
  await expect(groupList.getByText('Objetivo do Bruno', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar' }).click();

  await page.evaluate(user => {
    localStorage.setItem('access_token', user.token);
    localStorage.setItem('user_email', user.email);
    localStorage.setItem('username', user.username);
    localStorage.setItem('expires_at', String(Date.now() + 3_600_000));
  }, userB);
  await page.reload();
  await page.getByRole('button', { name: 'Gerenciar objetivos' }).click();
  const reloadedGroupList = page.getByLabel('Objetivos financeiros cadastrados');
  await expect(reloadedGroupList.getByText('Objetivo do Bruno', { exact: true })).toBeVisible();
  await expect(reloadedGroupList.getByText('Objetivo da Ana', { exact: true })).toHaveCount(0);
});

test('requires transfer or unlink and forwards concurrency versions', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi(); await authenticateAs(userA);
  const groups = [
    organizationGroupFixture({ id: 'g1', nome: 'Origem', versao: 'AQ==', quantidadeInvestimentos: 2 }),
    organizationGroupFixture({ id: 'g2', nome: 'Destino', versao: 'Ag==', quantidadeInvestimentos: 0 }),
  ];
  let exclusion: any;
  await page.route('**/api/InvestimentoGrupos**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: groups });
    exclusion = route.request().postDataJSON();
    groups.splice(0, 1);
    return route.fulfill({ status: 204 });
  });
  await page.goto('/investimento');
  await page.getByRole('button', { name: 'Gerenciar objetivos' }).click();
  await page.getByRole('button', { name: 'Excluir Origem' }).click();
  await expect(page.getByRole('group', { name: 'O que fazer com os investimentos?' })).toBeVisible();
  await page.getByLabel('Transferir para outro objetivo').check();
  await page.getByLabel('Objetivo de destino').selectOption('g2');
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await page.getByRole('button', { name: 'Entendi' }).click();
  expect(exclusion).toEqual({ versaoOrigem: 'AQ==', acaoVinculos: 'Transferir', grupoDestinoId: 'g2', versaoDestino: 'Ag==' });
});

test('deletes an empty group and preserves a used only group on stale and rollback failures before unlinking', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi(); await authenticateAs(userA);
  const groups = [
    organizationGroupFixture({ id: 'empty', nome: 'Sem vínculos', versao: 'AA==', quantidadeInvestimentos: 0 }),
    organizationGroupFixture({ id: 'used', nome: 'Objetivo único', versao: 'AQ==', quantidadeInvestimentos: 2 }),
  ];
  const commands: any[] = [];
  let usedAttempts = 0;

  await page.route('**/api/InvestimentoGrupos**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: groups });
    const body = route.request().postDataJSON();
    commands.push(body);
    if (route.request().url().includes('/empty/')) {
      groups.splice(groups.findIndex(group => group.id === 'empty'), 1);
      return route.fulfill({ status: 204 });
    }
    usedAttempts++;
    if (usedAttempts === 1) return route.fulfill({ status: 409, json: { code: 'grupo_desatualizado', message: 'O objetivo foi alterado.' } });
    if (usedAttempts === 2) return route.fulfill({ status: 500, json: { message: 'A operação foi revertida.' } });
    groups.splice(groups.findIndex(group => group.id === 'used'), 1);
    return route.fulfill({ status: 204 });
  });

  await page.goto('/investimento');
  await page.getByRole('button', { name: 'Gerenciar objetivos' }).click();
  await page.getByRole('button', { name: 'Excluir Sem vínculos' }).click();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('button', { name: 'Entendi' }).click();
  expect(commands[0]).toEqual({ versaoOrigem: 'AA==', acaoVinculos: 'ExigirVazio', grupoDestinoId: null, versaoDestino: null });

  await page.getByRole('button', { name: 'Gerenciar objetivos' }).click();
  await page.getByRole('button', { name: 'Excluir Objetivo único' }).click();
  await expect(page.getByLabel('Transferir para outro objetivo')).toHaveCount(0);
  await expect(page.getByLabel('Deixar sem grupo')).toBeChecked();

  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(page.getByText('O objetivo foi alterado.')).toBeVisible();
  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(page.getByLabel('Objetivos financeiros cadastrados').getByText('Objetivo único', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(page.getByText('A operação foi revertida.')).toBeVisible();
  await page.getByRole('button', { name: 'Entendi' }).click();
  await expect(page.getByLabel('Objetivos financeiros cadastrados').getByText('Objetivo único', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await page.getByRole('button', { name: 'Entendi' }).click();
  expect(commands.slice(1)).toEqual(Array(3).fill({
    versaoOrigem: 'AQ==', acaoVinculos: 'Desassociar', grupoDestinoId: null, versaoDestino: null,
  }));
});
