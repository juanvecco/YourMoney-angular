import { expect, test } from './fixtures/api.fixture';

test('uses the operating-system preference when no manual value exists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('ignores invalid storage and falls back to the operating-system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() => localStorage.setItem('ym_theme_v1', 'sepia'));
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('alternates and persists theme without losing route or form content', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  const email = page.getByLabel('E-mail');
  await email.fill('pessoa@example.com');
  const toggle = page.getByRole('button', { name: /modo escuro/i });
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(email).toHaveValue('pessoa@example.com');
  await expect(page).toHaveURL(/\/login$/);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page).toHaveURL(/\/login$/);
});

test('keeps a manual theme after logout', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi();
  await authenticateAs(userA);
  await page.addInitScript(() => localStorage.setItem('ym_theme_v1', 'dark'));
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /sair/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
