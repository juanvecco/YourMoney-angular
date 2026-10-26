import { expect, test } from './fixtures/api.fixture';

const viewports = [
  { width: 320, height: 800 }, { width: 768, height: 1024 },
  { width: 1280, height: 800 }, { width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`reflows without document overflow at ${viewport.width}px`, async ({ page, mockApi, authenticateAs, userA }) => {
    await page.setViewportSize(viewport);
    await mockApi();
    await authenticateAs(userA);
    for (const route of ['/dashboard', '/investimento']) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflows, `${route} should not overflow at ${viewport.width}px`).toBe(false);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });
}
