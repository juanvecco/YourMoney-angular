import { expect, test, consolidatedOrganizationFixture, organizationInvestmentFixture } from './fixtures/api.fixture';

test('links a monthly goal, confirms allocation and shows objective progress without double counting', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi(); await authenticateAs(userA);
  const objetivo = { id: 'objetivo-aluguel', nome: 'Aluguel para nós mesmos', versao: 'AQ==', quantidadeInvestimentos: 1,
    valorAlvo: 150000, dataAlvo: null, ativo: true, arquivadoEm: null };
  const investimento = organizationInvestmentFixture({ id: 'tesouro', nome: 'Tesouro Selic 2028', valorAtual: 3629.2,
    grupoObjetivoId: objetivo.id, grupoObjetivo: { id: objetivo.id, nome: objetivo.nome } });
  let meta: any = null;

  await page.route('**/api/InvestimentoGrupos/resumo**', route => route.fulfill({ json: [{ ...objetivo,
    valorAtualCarteira: 3629.2, percentualAlvoAtingido: 2.42, valorPlanejadoMes: 1000,
    valorConfirmadoMes: 1000, diferencaMes: 0, statusPlanejamento: 'PlanejadoAtingido', valorAguardandoAlocacao: 0,
    investimentos: [{ id: 'tesouro', nome: 'Tesouro Selic 2028', valorAtual: 3629.2 }], aportes: [] }] }));
  await page.route('**/api/InvestimentoGrupos**', async route => {
    if (route.request().url().includes('/resumo')) return route.fallback();
    if (route.request().method() === 'POST') return route.fulfill({ status: 201, json: objetivo });
    return route.fulfill({ json: [objetivo] });
  });
  await page.route('**/api/Investimento/consolidado**', route => route.fulfill({ json: consolidatedOrganizationFixture([investimento]) }));
  await page.route('**/api/Metas/resumo**', route => route.fulfill({ json: {
    mesReferencia: '2026-10-01', receitaTotal: 5000, receitaTotalBruta: 5000, receitaElegivelMetas: 5000,
    receitaExcluidaMetas: 0, despesaTotal: 0, despesaTotalBruta: 0, despesaTotalReembolsada: 0,
    percentualTotalComprometido: meta ? 20 : 0, valorTotalReservado: meta ? 1000 : 0,
    percentualRestante: meta ? 80 : 100, valorRestanteAntesDespesas: meta ? 4000 : 5000,
    saldoFinal: meta ? 4000 : 5000, valorFaltante: 0, status: 'disponivel', alertas: [], metas: meta ? [meta] : [] } }));
  await page.route('**/api/Metas', async route => {
    const body = route.request().postDataJSON();
    meta = { id: 'meta-aluguel', ...body, percentualReceita: 20, valorCalculado: 1000,
      objetivoNome: objetivo.nome, valorConfirmado: 0, valorRestante: 1000, diferenca: -1000,
      statusPlanejamento: 'AbaixoPlanejado', valorAguardandoAlocacao: 0, aportes: [] };
    await route.fulfill({ status: 201, json: meta });
  });
  await page.route('**/api/Metas/meta-aluguel/aportes', async route => {
    const body = route.request().postDataJSON();
    meta = { ...meta, valorConfirmado: body.valor, valorRestante: 0, diferenca: 0, statusPlanejamento: 'PlanejadoAtingido' };
    await route.fulfill({ status: 201, json: { id: 'aporte-1', metaMensalId: meta.id,
      grupoObjetivoInvestimentoId: objetivo.id, investimentoId: body.investimentoId, valor: body.valor,
      dataConfirmacao: body.dataConfirmacao, mesReferencia: '2026-10-01', aguardandoAlocacao: false } });
  });

  await page.goto('/metas');
  await page.getByLabel('Nome').fill('Aluguel para nós mesmos');
  await page.getByLabel('Definir meta por').selectOption('Valor');
  await page.getByLabel('Valor da meta').fill('1000');
  await page.getByPlaceholder('Ex.: Aluguel para nós mesmos').fill(objetivo.nome);
  await page.getByPlaceholder('Valor-alvo (opcional)').fill('150000');
  await page.getByRole('button', { name: 'Criar e selecionar' }).click();
  await expect(page.getByLabel('Objetivo financeiro (opcional)').locator('option:checked')).toHaveText(objetivo.nome);
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText(objetivo.nome).last()).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar valor guardado' }).click();
  await page.getByLabel('Onde o dinheiro ficou alocado').selectOption('tesouro');
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Planejado atingido')).toBeVisible();

  await page.goto('/investimento');
  await expect(page.getByRole('heading', { name: objetivo.nome })).toBeVisible();
  await expect(page.getByText('R$ 3.629,20').first()).toBeVisible();
  await expect(page.getByText('Planejado atingido')).toBeVisible();
});
