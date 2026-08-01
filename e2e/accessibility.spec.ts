import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/api.fixture';

const protectedRoutes = ['/dashboard', '/receitas', '/despesas', '/disponivel', '/investimento', '/metas', '/configuracao'];

for (const theme of ['light', 'dark'] as const) {
  test(`has no serious or critical axe violations in ${theme} theme`, async ({ page, mockApi, authenticateAs, userA }) => {
    await mockApi();
    await authenticateAs(userA);
    await page.addInitScript(selectedTheme => localStorage.setItem('ym_theme_v1', selectedTheme), theme);

    for (const route of protectedRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const results = await new AxeBuilder({ page }).analyze();
      const blocking = results.violations.filter(violation => violation.impact === 'serious' || violation.impact === 'critical');
      expect(blocking, `${route}: ${blocking.map(item => item.id).join(', ')}`).toEqual([]);
    }
  });
}
