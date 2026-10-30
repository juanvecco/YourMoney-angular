import { expect, test } from './fixtures/api.fixture';

test('offers a uniform public and authenticated shell with one logout', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();

  await authenticateAs(userA);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(nav.getByRole('link', { name: 'Disponível' })).toBeVisible();
  await expect(nav.getByRole('button', { name: /sair/i })).toHaveCount(1);
  await nav.getByRole('link', { name: 'Disponível' }).click();
  await expect(page).toHaveURL(/\/disponivel$/);
  await expect(nav.getByRole('link', { name: 'Disponível' })).toHaveAttribute('aria-current', 'page');
});
