import { expect, test } from './fixtures/api.fixture';

test('keeps the selected month between monthly areas and clears it on logout', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi();
  await authenticateAs(userA);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const picker = page.getByRole('group', { name: 'Período financeiro' });
  await picker.getByRole('button', { name: 'Mês anterior' }).click();
  const selectedLabel = (await picker.locator('[aria-live="polite"]').textContent())?.trim();

  await page.getByRole('link', { name: 'Receitas' }).click();
  await expect(page.getByRole('group', { name: 'Período financeiro' })).toContainText(selectedLabel ?? '');

  await page.getByRole('button', { name: /sair/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', /light|dark/);
});
