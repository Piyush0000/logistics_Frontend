import { expect, type Page } from '@playwright/test';

/**
 * The admin account the e2e servers are started with (see `testAdmin` in playwright.config.ts).
 * Test-only values; production reads ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_SESSION_SECRET.
 */
export const TEST_ADMIN = {
  email: 'admin@evocships.test',
  password: 'evoc-admin-e2e-password',
};

/** Signs in to the admin panel and waits for the Overview page. */
export async function signInAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(TEST_ADMIN.email);
  await page.getByLabel('Password').fill(TEST_ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/admin');
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
}
