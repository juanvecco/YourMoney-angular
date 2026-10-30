import { expect, test } from './fixtures/api.fixture';

for (const form of [
  { route: '/despesas', button: 'Nova despesa', modal: '#modalDespesa', required: 6 },
  { route: '/receitas', button: 'Nova receita', modal: '#modalReceita', required: 5 },
  { route: '/investimento', button: 'Novo investimento', modal: '#modalInvestimento', required: 8 },
]) {
  test(`explains and labels required fields when creating at ${form.route}`, async ({ page, mockApi, authenticateAs, userA }) => {
    await mockApi();
    await authenticateAs(userA);
    if (form.route === '/investimento') await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(form.route);
    await page.getByRole('button', { name: form.button }).first().click();
    const modal = page.locator(form.modal);
    await expect(modal.getByText('Campos com * são obrigatórios.')).toBeVisible();
    expect(await modal.locator('.modal-title').evaluate(element => {
      const bounds = element.getBoundingClientRect();
      const target = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      return !!target && (target === element || element.contains(target));
    })).toBe(true);
    const fields = modal.locator('input[required], select[required]');
    await expect(fields).toHaveCount(form.required);
    for (const field of await fields.all()) {
      await expect(field).toBeVisible();
      expect(await field.evaluate(element => Array.from((element as HTMLInputElement).labels ?? [])
        .some(label => !!label.querySelector('.ym-required') && !!label.textContent?.trim()))).toBe(true);
    }
    if (form.route === '/despesas') {
      await expect(modal.getByLabel('Natureza da Despesa (opcional)')).not.toHaveAttribute('required');
      await modal.getByLabel('Despesa parcelada').check();
      await expect(modal.getByLabel('Quantidade de parcelas')).toHaveAttribute('required', '');
    }
    if (form.route === '/investimento') {
      await expect(modal.getByLabel('ISIN (opcional)')).not.toHaveAttribute('required');
      await page.screenshot({ path: 'test-results/usability-investment-required-dark.png' });
    }
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal).not.toBeVisible();
  });
}

test('marks only the active goal definition and preserves optional objectives', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi();
  await authenticateAs(userA);
  await page.goto('/metas');
  const form = page.locator('form').filter({ has: page.getByLabel('Definir meta por') });
  await expect(form.getByText('Campos com * são obrigatórios.')).toBeVisible();
  await form.getByLabel('Definir meta por').selectOption('Valor');
  await expect(form.getByRole('spinbutton', { name: 'Valor da meta', exact: true })).toHaveAttribute('required', '');
  await form.getByLabel('Definir meta por').selectOption('Percentual');
  await expect(form.getByLabel('Percentual da receita')).toHaveAttribute('required', '');
  await expect(form.getByRole('spinbutton', { name: 'Valor da meta', exact: true })).toHaveCount(0);
  await expect(form.getByLabel('Objetivo financeiro (opcional)')).not.toHaveAttribute('required');
});

test('shows the required account name before entering any data', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi();
  await authenticateAs(userA);
  await page.goto('/configuracao');
  await page.getByRole('button', { name: 'Contas', exact: true }).click();
  const form = page.locator('.account-form');
  await expect(form.getByText('Campos com * são obrigatórios.')).toBeVisible();
  await expect(form.getByLabel('Nome da conta')).toHaveAttribute('required', '');
  await expect(form.locator('label .ym-required')).toBeVisible();
});
