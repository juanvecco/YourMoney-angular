import { expect, test } from './fixtures/api.fixture';

const destinations = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Receitas', path: '/receitas' },
  { label: 'Despesas', path: '/despesas' },
  { label: 'Investimentos', path: '/investimento' },
  { label: 'Metas', path: '/metas' },
  { label: 'Conexões', path: '/openfinance' },
];

const viewports = [
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
  { width: 320, height: 400 },
];

for (const viewport of viewports) {
  test(`keeps all drawer destinations reachable at ${viewport.width}x${viewport.height}`, async ({ page, mockApi, authenticateAs, userA }) => {
    await page.setViewportSize(viewport);
    await mockApi();
    await authenticateAs(userA);
    await page.goto('/dashboard');

    if (viewport.width <= 980) await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
    const drawer = page.locator('#main-menu');
    const navigation = drawer.getByRole('navigation', { name: 'Telas do aplicativo' });
    await expect(drawer).toHaveAttribute('aria-hidden', 'false');
    if (viewport.width > 980) {
      const bounds = await drawer.boundingBox();
      const content = await page.locator('#main-content').boundingBox();
      expect(content!.x).toBeGreaterThanOrEqual(bounds!.x + bounds!.width);
      await expect(page.locator('.ym-app-drawer-backdrop')).not.toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    }

    const hrefs: string[] = [];
    for (const destination of destinations) {
      const link = navigation.getByRole('link', { name: destination.label, exact: true });
      await expect(link).toBeVisible();
      hrefs.push(await link.getAttribute('href') ?? '');
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeInViewport();
    }

    expect(hrefs).toEqual(destinations.map(destination => destination.path));

    if (viewport.width === 1366) {
      const metrics = await navigation.evaluate(element => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
    }
  });
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 360, height: 640 },
  { width: 320, height: 568 },
]) {
  test(`keeps account actions labeled and separated at ${viewport.width}px`, async ({ page, mockApi, authenticateAs, userA }) => {
    await page.setViewportSize(viewport);
    await mockApi();
    await authenticateAs(userA);
    await page.goto('/dashboard');

    const actions = page.locator('.ym-topbar__actions');
    await expect(actions.getByRole('button', { name: /Mostrar valores|Ocultar valores/ })).toBeVisible();
    await expect(actions.getByRole('button', { name: /Ativar modo/ })).toBeVisible();
    await expect(actions.getByRole('link', { name: 'Configurações' })).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Sair' })).toBeVisible();

    const valuesToggle = actions.locator('.ym-topbar__icon-action');
    const valuesBefore = await valuesToggle.getAttribute('aria-pressed');
    await valuesToggle.click();
    expect(await valuesToggle.getAttribute('aria-pressed')).not.toBe(valuesBefore);

    const themeToggle = actions.locator('.ym-theme-toggle');
    const themeBefore = await themeToggle.getAttribute('aria-pressed');
    await themeToggle.click();
    expect(await themeToggle.getAttribute('aria-pressed')).not.toBe(themeBefore);
    await expect(themeToggle.locator('span')).toHaveClass(/visually-hidden/);

    for (const selector of ['a[href="/configuracao"] .ym-topbar__label', '[data-testid="logout"] .ym-topbar__label']) {
      const label = actions.locator(selector);
      const bounds = await label.boundingBox();
      expect(bounds?.width ?? 0).toBeGreaterThan(10);
      await expect(label).toBeInViewport();
    }

    const triggerBounds = await page.locator('.ym-menu-trigger').boundingBox();
    const brandBounds = await page.locator('.ym-brand').boundingBox();
    const actionsBounds = await actions.boundingBox();
    expect(triggerBounds).not.toBeNull();
    expect(brandBounds).not.toBeNull();
    expect(actionsBounds).not.toBeNull();
    expect((triggerBounds?.x ?? 0) + (triggerBounds?.width ?? 0)).toBeLessThanOrEqual(brandBounds?.x ?? 0);
    expect((brandBounds?.x ?? 0) + (brandBounds?.width ?? 0)).toBeLessThanOrEqual(actionsBounds?.x ?? 0);
    expect((actionsBounds?.x ?? 0) + (actionsBounds?.width ?? 0)).toBeLessThanOrEqual(viewport.width);
  });
}

test('keeps desktop destinations expanded while navigating between pages', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi();
  await authenticateAs(userA);
  await page.goto('/dashboard');

  for (const destination of destinations) {
    const drawer = page.locator('#main-menu');
    await drawer.getByRole('link', { name: destination.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${destination.path.replaceAll('/', '\\/')}$`));
    await expect(drawer).toHaveAttribute('aria-hidden', 'false');
  }
});

test('keeps mobile navigation compact and closes the drawer after choosing a page', async ({ page, mockApi, authenticateAs, userA }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await mockApi();
  await authenticateAs(userA);
  await page.goto('/dashboard');
  for (const destination of destinations) {
    await page.getByRole('button', { name: 'Abrir menu de navegação' }).click();
    const drawer = page.locator('#main-menu');
    await drawer.getByRole('link', { name: destination.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${destination.path.replaceAll('/', '\\/')}$`));
    await expect(drawer).toHaveAttribute('aria-hidden', 'true');
  }
});

test('opens Configurações and ends the session from the top bar', async ({ page, mockApi, authenticateAs, userA }) => {
  await mockApi();
  await authenticateAs(userA);
  await page.goto('/dashboard');

  const actions = page.locator('.ym-topbar__actions');
  await actions.getByRole('link', { name: 'Configurações' }).click();
  await expect(page).toHaveURL(/\/configuracao$/);
  await page.locator('.ym-topbar__actions').getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});
