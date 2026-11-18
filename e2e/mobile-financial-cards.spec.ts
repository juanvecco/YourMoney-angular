import { expect, test } from './fixtures/api.fixture';

test('mobile cards stay compact and open transaction details on a slow connection', async ({ page, mockApi, authenticateAs, userA }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi();
  await authenticateAs(userA);
  const referencia = new Date().toISOString().slice(0, 7);

  await page.route('**/api/Movimentacoes?*', async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ json: { itens: [], pagina: 1, tamanhoPagina: 10, totalItens: 2, totalPaginas: 1,
      totaisPorMes: [{ mesReferencia: referencia, receitas: 3000, despesas: 180,
        investimentos: 0, saldo: 2820, totalItens: 2 }] } });
  });

  await page.route('**/api/regras-negocio', route => route.fulfill({ json: [
    { codigo: 'investimentos.objetivos', nome: 'Objetivos', descricao: '', grupo: 'Investimentos',
      ativa: true, efetiva: true, dependencias: [] },
    { codigo: 'despesas.conciliacao-fatura-cartao', nome: 'Conferência', descricao: '', grupo: 'Despesas',
      ativa: true, efetiva: true, dependencias: [] },
  ] }));
  await page.route('**/api/Receitas/por-referencia?*', async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ json: [{ id: 'receita-e2e', descricao: 'Salário', valor: 3000,
      data: '2026-11-05', mesReferencia: '2026-11-01', natureza: 'RendaDisponivel',
      consideraNasMetas: true, valorAbatidoEmDespesa: 0, contaDescricao: 'Conta principal' }] });
  });
  await page.route('**/api/Despesas/consulta?*', async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.fulfill({ json: { itens: [{ id: 'despesa-e2e', descricao: 'Mercado', valor: 180,
      data: '2026-11-06', mesReferencia: '2026-11-01', idContaFinanceira: 'conta-e2e',
      idCategoria: 'categoria-e2e', valorLiquido: 180, conferida: false }],
      paginaAtual: 1, tamanhoPagina: 10, totalPaginas: 1, totalResultados: 1,
      valorTotalFiltrado: 180, totaisPorConta: [{ idContaFinanceira: 'conta-e2e', valor: 180 }] } });
  });
  await page.route('**/api/InvestimentoGrupos/resumo?*', route => route.fulfill({ json: [
    { id: 'objetivo-1', nome: 'Reserva', descricao: 'Emergência', quantidadeInvestimentos: 1,
      valorAtualCarteira: 500, valorAlvo: 1000, percentualAlvoAtingido: 50,
      valorPlanejadoMes: 100, valorConfirmadoMes: 100, valorAguardandoAlocacao: 0 },
    { id: 'objetivo-2', nome: 'Viagem', descricao: 'Férias', quantidadeInvestimentos: 0,
      valorAtualCarteira: 200, valorAlvo: 2000, percentualAlvoAtingido: 10,
      valorPlanejadoMes: 50, valorConfirmadoMes: 50, valorAguardandoAlocacao: 0 },
  ] }));

  await page.goto('/dashboard');
  await expect(page.locator('.ym-dashboard-kpis .ym-kpi')).toHaveCount(4);
  const cards = await page.locator('.ym-dashboard-kpis .ym-kpi').all();
  await expect(cards[0]).toBeVisible();
  const first = await cards[0].boundingBox();
  const second = await cards[1].boundingBox();
  expect(first?.y).toBe(second?.y);
  expect((first?.x ?? 0) + (first?.width ?? 0)).toBeLessThan(second?.x ?? 0);

  await page.goto('/receitas');
  const revenue = page.getByRole('button', { name: 'Ver detalhes de Salário' });
  await expect(revenue).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excluir receita' })).toHaveCount(0);
  await revenue.click();
  await expect(page.getByRole('button', { name: 'Editar receita' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excluir receita' })).toBeVisible();

  await page.goto('/despesas');
  const expense = page.getByRole('button', { name: 'Ver detalhes de Mercado' });
  await expect(expense).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excluir despesa' })).toHaveCount(0);
  await expense.click();
  await expect(page.getByRole('button', { name: 'Editar despesa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excluir despesa' })).toBeVisible();

  await page.goto('/investimento');
  const objectives = page.locator('.ym-objective-summary__grid');
  await expect(objectives.locator('.ym-objective-card')).toHaveCount(2);
  const horizontalScroll = await objectives.evaluate(element => element.scrollWidth > element.clientWidth);
  expect(horizontalScroll).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
