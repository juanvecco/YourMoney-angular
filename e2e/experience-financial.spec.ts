import { expect, test } from './fixtures/api.fixture';

test('keeps authoritative totals aligned across activity, dashboard and available', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi();
  await authenticateAs(userA);

  await page.goto('/movimentacoes');
  await expect(page.getByRole('heading', { name: 'Movimentações', level: 1 })).toBeVisible();
  await expect(page.getByText('Salário')).toBeVisible();
  await expect(page.getByLabel('Resumo do período')).toContainText('R$ 3.000,00');
  await expect(page.getByLabel('Resumo do período')).toContainText('R$ 1.800,00');

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Visão geral', level: 1 })).toBeVisible();
  await expect(page.getByText('R$ 3.000,00')).toBeVisible();
  await expect(page.getByText('R$ 1.800,00')).toBeVisible();

  await page.goto('/disponivel');
  await expect(page.getByRole('heading', { name: 'Disponível', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Resumo do saldo disponível')).toContainText('R$ 1.800,00');
});

test('activity filters remain usable at mobile width', async ({ page, mockApi, authenticateAs, userA }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await mockApi();
  await authenticateAs(userA);
  await page.goto('/movimentacoes');

  await page.getByLabel('Tipo').selectOption('despesa');
  await page.getByLabel('Buscar').fill('moradia');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByRole('heading', { name: 'Movimentações' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
