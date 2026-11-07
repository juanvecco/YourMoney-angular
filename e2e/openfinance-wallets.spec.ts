import { expect, test } from './fixtures/api.fixture';

test('wallet selection scopes Meu Pluggy requests and creates a manual bank account in that wallet', async ({
  page, mockApi, authenticateAs, userA,
}) => {
  await mockApi();
  await authenticateAs(userA);
  await page.setViewportSize({ width: 1366, height: 768 });

  const connectionRequestUrls: string[] = [];
  const overviewRequestUrls: string[] = [];
  const accountRequests: Record<string, unknown>[] = [];
  const accountMoveRequests: Record<string, unknown>[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/OpenFinance/connections')) connectionRequestUrls.push(request.url());
    if (request.url().includes('/api/OpenFinance/real-transactions/overview')) overviewRequestUrls.push(request.url());
    if (request.url().includes('/api/ContaFinanceira') && request.method() === 'POST') {
      accountRequests.push(request.postDataJSON() as Record<string, unknown>);
    }
    if (request.url().includes('/api/ContaFinanceira/') && request.url().endsWith('/carteira') && request.method() === 'PUT') {
      accountMoveRequests.push(request.postDataJSON() as Record<string, unknown>);
    }
  });

  await page.goto('/openfinance', { waitUntil: 'domcontentloaded' });
  const walletSelect = page.getByLabel('Carteira selecionada');
  await expect(walletSelect).toHaveValue('wallet-principal');

  await walletSelect.selectOption('wallet-esposa');
  await expect.poll(() => connectionRequestUrls.some(url => url.includes('carteiraId=wallet-esposa'))).toBe(true);
  await expect.poll(() => overviewRequestUrls.some(url => url.includes('carteiraId=wallet-esposa'))).toBe(true);
  await expect(page.getByRole('heading', { name: 'Banco da esposa' })).toBeVisible();
  await expect(page.getByText('Atualizada', { exact: true })).toBeVisible();
  await expect(page.locator('.of-count')).toHaveText('1/5');
  await expect(page.getByRole('heading', { name: 'Credenciais Pluggy' })).toHaveCount(0);
  await page.locator('.of-manual-accounts > summary').click();
  await expect(page.getByText('Nenhuma conta bancária cadastrada nesta carteira.')).toBeVisible();

  await page.getByRole('button', { name: 'Adicionar conta' }).click();
  await page.getByLabel('Nome da conta').fill('Banco da família');
  await page.getByRole('button', { name: 'Salvar conta bancária' }).click();

  await expect(page.getByText('Banco da família', { exact: true })).toBeVisible();
  expect(accountRequests).toEqual([{ descricao: 'Banco da família', carteiraId: 'wallet-esposa' }]);

  await page.locator('select[name="accountToMove"]').selectOption('conta-e2e');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Mover conta' }).click();
  await expect.poll(() => accountMoveRequests.length).toBe(1);
  expect(accountMoveRequests).toEqual([{ carteiraId: 'wallet-esposa', confirmarTransferencia: true }]);
});

test('shows only the authenticated user wallets and keeps the page usable on mobile', async ({
  page, mockApi, authenticateAs, userB,
}) => {
  await mockApi();
  await authenticateAs(userB);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/openfinance', { waitUntil: 'domcontentloaded' });

  const walletSelect = page.getByLabel('Carteira selecionada');
  await expect(walletSelect).toHaveValue('wallet-bruno');
  await expect(walletSelect.locator('option')).toHaveCount(1);
  await expect(page.getByText('Carteira da esposa', { exact: true })).toHaveCount(0);
  const activateButton = page.getByRole('button', { name: 'Conectar banco' });
  await expect(activateButton).toBeVisible();
  await expect(activateButton).toBeEnabled();
  const connectTokenUrls: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/OpenFinance/connect-token')) connectTokenUrls.push(request.url());
  });
  await activateButton.click();
  await expect(page.getByText('Credenciais desta carteira precisam ser atualizadas.')).toBeVisible();
  expect(connectTokenUrls.some(url => url.includes('carteiraId=wallet-bruno'))).toBe(true);

  const demoSummary = page.locator('.of-demo-disclosure > summary');
  await demoSummary.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Fontes de demonstração' })).toBeVisible();

  const overflowsHorizontally = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflowsHorizontally).toBe(false);
});
