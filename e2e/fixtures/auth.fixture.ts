import { test as base } from '@playwright/test';

export type TestUser = {
  email: string;
  username: string;
  token: string;
};

type AuthFixtures = {
  userA: TestUser;
  userB: TestUser;
  authenticateAs: (user: TestUser) => Promise<void>;
};

export const test = base.extend<AuthFixtures>({
  userA: { email: 'ana@example.test', username: 'Ana', token: 'e2e-token-ana' },
  userB: { email: 'bruno@example.test', username: 'Bruno', token: 'e2e-token-bruno' },
  authenticateAs: async ({ page }, use) => {
    await use(async (user) => {
      await page.addInitScript((selectedUser: TestUser) => {
        localStorage.setItem('access_token', selectedUser.token);
        localStorage.setItem('user_email', selectedUser.email);
        localStorage.setItem('username', selectedUser.username);
        localStorage.setItem('expires_at', String(Date.now() + 3_600_000));
      }, user);
    });
  },
});

export { expect } from '@playwright/test';
