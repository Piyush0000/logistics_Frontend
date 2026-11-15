import { expect, test } from '@playwright/test';
import { ADMIN_NAV } from '../src/components/admin/admin-nav';
import { signIn } from './helpers';
import { signInAdmin, TEST_ADMIN } from './admin-helpers';

// The admin foundation: sign-in, the guard on every page, the menu and each section loading.
// Section owners add their own specs as e2e/admin-<section>.spec.ts, starting with signInAdmin(page).

test.describe('admin sign-in', () => {
  test('sends a signed-out visitor to the admin sign-in', async ({ page }) => {
    await page.goto('/admin/merchants');
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in to the admin panel' })).toBeVisible();
  });

  test('refuses a wrong password', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill(TEST_ADMIN.email);
    await page.getByLabel('Password').fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('That email and password do not match.')).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('never prints the demo password on a production build', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.getByTestId('admin-demo-hint')).toHaveCount(0);
  });

  test('does not let a merchant session in', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test('signs in and out', async ({ page }) => {
    await signInAdmin(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe('admin sections', () => {
  test.beforeEach(async ({ page }) => {
    await signInAdmin(page);
  });

  for (const item of ADMIN_NAV) {
    test(`opens ${item.label}`, async ({ page }) => {
      const response = await page.goto(item.href);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: item.label })).toBeVisible();
    });
  }

  test('marks the current section in the menu', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'The desktop menu is hidden on phones');
    await page.goto('/admin/money');
    await expect(page.getByRole('navigation', { name: 'Admin' }).getByRole('link', { name: 'Money' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('opens the menu on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone menu only');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('dialog', { name: 'Admin menu' }).getByRole('link', { name: 'Support' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Support' })).toBeVisible();
  });

  test('answers 404 for an admin page that does not exist', async ({ page }) => {
    const response = await page.goto('/admin/no-such-section');
    expect(response?.status()).toBe(404);
  });

  test('labels sample data on the overview', async ({ page }) => {
    await expect(page.getByTestId('admin-attention').getByText('Sample data')).toBeVisible();
  });

  test('does not scroll sideways', async ({ page }) => {
    for (const item of ADMIN_NAV) {
      await page.goto(item.href);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, item.href).toBeLessThanOrEqual(0);
    }
  });
});
