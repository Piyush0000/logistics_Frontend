import type { Page } from '@playwright/test';

export const DEMO_EMAIL = 'ops@example.com';
export const DEMO_CODE = '123456';

/** Opens the login page and waits until the form is interactive. */
export async function openLogin(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
}

export async function fillDetails(page: Page, email = DEMO_EMAIL) {
  await page.getByLabel('Work email').fill(email);
  await page.getByRole('checkbox').check();
}

export async function signIn(page: Page) {
  await openLogin(page);
  await page.getByRole('tab', { name: 'Email + Password' }).click();
  await fillDetails(page);
  await page.locator('input[name="password"]').fill('demo-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
}
