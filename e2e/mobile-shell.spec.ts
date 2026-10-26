import { expect, test } from './fixtures/api.fixture';

test.describe('mobile application shell', () => {
  test.beforeEach(async ({ page, mockApi, authenticateAs, userA }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockApi();
    await authenticateAs(userA);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  });

  test('shows the bottom navigation and secondary actions sheet', async ({ page }) => {
    const mobileNav = page.getByRole('navigation', { name: 'Navegação do aplicativo' });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Início' })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: 'Despesa' })).toBeVisible();

    await mobileNav.getByRole('button', { name: 'Mais' }).click();
    const moreOptions = page.getByRole('dialog', { name: 'Mais opções' });
    await expect(moreOptions).toBeVisible();
    await expect(moreOptions.getByRole('link', { name: 'Configurações' })).toBeVisible();
    await expect(moreOptions.getByRole('button', { name: 'Sair' })).toBeVisible();
  });

  test('uses the expense shortcut without horizontal overflow', async ({ page }) => {
    await page.getByRole('navigation', { name: 'Navegação do aplicativo' })
      .getByRole('link', { name: 'Despesa' })
      .click();

    await expect(page).toHaveURL(/\/despesas$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflows).toBe(false);
  });
});
