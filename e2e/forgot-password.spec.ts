import { expect, test, type Page } from '@playwright/test';
import { DEMO_EMAIL, openLogin, signIn } from './helpers';
import { SIZES, expectNoSidewaysScroll, expectTapTargets } from './screen-checks';

const SENT = 'If an account exists for this email, a reset link is on its way.';
const send = { name: 'Send reset link' };

async function openForgot(page: Page) {
  await page.goto('/forgot-password', { waitUntil: 'networkidle' });
}

test('links from the password field', async ({ page }) => {
  await openLogin(page);
  await page.getByRole('tab', { name: 'Email + Password' }).click();

  await page.getByRole('link', { name: 'Forgot password?' }).click();

  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reset your password');
});

test('starts with a disabled button and shows no reference brand', async ({ page }) => {
  await openForgot(page);

  await expect(page.getByRole('button', send)).toBeDisabled();
  await expect(page.locator('body')).not.toContainText(/mera|courier ?wala|sharkship/i);
});

test('explains an invalid email after leaving the field', async ({ page }) => {
  await openForgot(page);
  await page.getByLabel('Work email').fill('not-an-email');
  await page.getByLabel('Work email').blur();

  await expect(page.getByText('Enter a valid work email.')).toBeVisible();
  await expect(page.getByRole('button', send)).toBeDisabled();
});

test('gives the same message for any valid email', async ({ page }) => {
  for (const email of [DEMO_EMAIL, 'nobody-at-all@example.org']) {
    await openForgot(page);
    await page.getByLabel('Work email').fill(email);
    await page.getByRole('button', send).click();

    await expect(page.getByRole('status')).toContainText(SENT);
  }
});

test('says no email is sent in demo mode', async ({ page }) => {
  await openForgot(page);
  await page.getByLabel('Work email').fill(DEMO_EMAIL);
  await page.getByRole('button', send).click();

  await expect(page.getByRole('status')).toContainText('Demo mode: no email is sent.');
});

test('goes back to sign in', async ({ page }) => {
  await openForgot(page);

  await page.getByRole('link', { name: 'Back to sign in' }).click();

  await expect(page).toHaveURL(/\/login$/);
});

test('sends signed-in visitors to the dashboard', async ({ page }) => {
  await signIn(page);

  await page.goto('/forgot-password');

  await expect(page).toHaveURL(/\/dashboard$/);
});

test('wraps a very long email without scrolling sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openForgot(page);
  await page.getByLabel('Work email').fill(`${'a'.repeat(120)}@example.com`);
  await page.getByRole('button', send).click();
  await expect(page.getByRole('status')).toBeVisible();

  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('does not scroll sideways at any size', async ({ page }) => {
  await openForgot(page);

  await expectNoSidewaysScroll(page, SIZES);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await openForgot(page);

  await expectTapTargets(page, [
    page.getByLabel('Work email'),
    page.getByRole('button', send),
    page.getByRole('link', { name: 'Back to sign in' }),
  ]);
});

test.describe('phone balance', () => {
  async function expectBalanced(page: Page) {
    const section = await page.getByTestId('forgot-section').boundingBox();
    const content = await page.getByTestId('forgot-content').boundingBox();
    if (!section || !content) throw new Error('Layout not found');

    const above = content.y - section.y;
    const below = section.y + section.height - (content.y + content.height);

    expect(Math.abs(above - below)).toBeLessThanOrEqual(2);
  }

  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [412, 915],
  ] as const) {
    test(`fits and centres on phones at ${width}x${height}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
      await page.setViewportSize({ width, height });
      await openForgot(page);

      const panel = await page.getByTestId('brand-panel').boundingBox();
      expect(panel?.height ?? 0).toBeGreaterThanOrEqual(height * 0.28);
      await expectBalanced(page);

      await page.getByLabel('Work email').fill(DEMO_EMAIL);
      await page.getByRole('button', send).click();
      await page.getByRole('status').waitFor();
      await expectBalanced(page);
    });
  }
});
