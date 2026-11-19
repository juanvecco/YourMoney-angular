import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/identidade/metodos', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ google: false, apple: false })
  }));
});

for (const width of [320, 390]) {
  test(`guided signup stays usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await page.goto('/cadastro');
    await expect(page.getByRole('heading', { name: 'Como podemos te chamar?' })).toBeVisible();
    await expect(page.getByLabel('Seu nome')).toBeVisible();
    await page.getByLabel('Seu nome').fill('Maria Silva');
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: 'Prazer em te conhecer, Maria!' })).toBeVisible();
    const mascot = page.getByRole('img', { name: 'Carteirinha, mascote do YourMoney, acenando para você' });
    await expect(mascot).toBeVisible();
    await expect.poll(() => mascot.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    if (width === 390) await page.screenshot({ path: 'test-results/onboarding-carteirinha-mobile.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: /Minha fatura/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Instagram' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: 'Crie sua conta' })).toBeVisible();
    await expect(page.locator('[data-provider="google"]')).toBeDisabled();
    await expect(page.locator('[data-provider="apple"]')).toBeDisabled();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hasOverflow).toBe(false);
    if (width === 390) await page.screenshot({ path: 'test-results/onboarding-method-mobile.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await expect(page.getByLabel('Seu e-mail')).toBeVisible();
    await expect(page.getByLabel('Criar senha')).toBeVisible();
  });
}

test('invitation accepts a full link and preserves it in registration', async ({ page }) => {
  await page.route('**/api/identidade/convites/validar?**', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ valido: true, motivo: '' })
  }));
  await page.goto('/cadastro?convite=admin.abcdefghijklmnopqrstuvwxyz0123456789abcdefgh');
  await expect(page.getByText('Convite aplicado')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Como podemos te chamar?' })).toBeVisible();
  await page.getByLabel('Seu nome').fill('Ana');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: /Meus gastos/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Google', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Tenho um convite' }).click();
  await page.getByLabel('Link ou código do convite').fill('https://yourmoney-piloto.onrender.com/cadastro?convite=admin.abcdefghijklmnopqrstuvwxyz0123456789abcdefgh');
  await page.getByRole('button', { name: 'Usar convite' }).click();
  await expect(page.getByText('Convite aplicado')).toBeVisible();
});
