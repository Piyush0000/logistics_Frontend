import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { openLogin, signIn } from './helpers';
import { SIZES, expectNoSidewaysScroll, expectTapTargets } from './screen-checks';

const create = { name: 'Create account' };

/** Unique per project, repeat and retry, so tests never collide on the shared mock store. */
function uniqueEmail(testInfo: TestInfo, prefix = 'su') {
  const { project, repeatEachIndex, retry } = testInfo;
  return `${prefix}-${project.name}-${repeatEachIndex}-${retry}-${Date.now()}@example.com`;
}

async function openSignup(page: Page) {
  await page.goto('/signup', { waitUntil: 'networkidle' });
}

async function fillAll(page: Page, email: string, password = 'long-enough-1') {
  await page.getByLabel('Company name').fill('Acme Traders');
  await page.getByLabel('Your name').fill('Asha Rao');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Phone number').fill('9876543210');
  await page.locator('input[name="password"]').fill(password);
}

test('creates an account and lands on Home', async ({ page }, testInfo) => {
  await openSignup(page);
  await fillAll(page, uniqueEmail(testInfo));
  await page.getByRole('checkbox').check();
  await page.getByRole('button', create).click();

  await expect(page).toHaveURL(/\/home$/);
});

test('rejects a short password', async ({ page }, testInfo) => {
  await openSignup(page);
  await fillAll(page, uniqueEmail(testInfo), 'short');
  await page.getByRole('checkbox').check();
  await page.locator('input[name="password"]').blur();

  await expect(page.getByText('Use at least 8 characters.')).toBeVisible();
  await expect(page.getByRole('button', create)).toBeDisabled();
});

test('requires the terms', async ({ page }, testInfo) => {
  await openSignup(page);
  await fillAll(page, uniqueEmail(testInfo));

  await expect(page.getByRole('button', create)).toBeDisabled();
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button', create)).toBeEnabled();
});

test('links between sign-in and sign-up', async ({ page }) => {
  await openLogin(page);
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create your account');

  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('says it is a demo', async ({ page }) => {
  await openSignup(page);
  await expect(page.getByText('Demo mode: no account is created or stored, and any email works.')).toBeVisible();
});

test('shows no reference brand', async ({ page }) => {
  await openSignup(page);
  await expect(page.locator('body')).not.toContainText(/mera|courier ?wala|sharkship/i);
});

test('sends signed-in visitors to the dashboard', async ({ page }) => {
  await signIn(page);

  await page.goto('/signup');

  await expect(page).toHaveURL(/\/dashboard$/);
});

test('wraps long values without scrolling sideways', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await openSignup(page);
  await page.getByLabel('Company name').fill('C'.repeat(80));
  await page.getByLabel('Your name').fill('N'.repeat(80));
  await page.getByLabel('Work email').fill(uniqueEmail(testInfo, 'a'.repeat(100)));

  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('does not scroll sideways at any size', async ({ page }) => {
  await openSignup(page);

  await expectNoSidewaysScroll(page, SIZES);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await openSignup(page);

  await expectTapTargets(page, [
    page.getByLabel('Company name'),
    page.getByLabel('Your name'),
    page.getByLabel('Work email'),
    page.getByLabel('Phone number'),
    page.locator('input[name="password"]'),
    page.getByRole('button', create),
    page.getByRole('link', { name: 'Sign in', exact: true }),
  ]);
});

test.describe('phone balance', () => {
  for (const [width, height] of [
    [390, 844],
    [412, 915],
  ] as const) {
    test(`keeps the brand panel and form together at ${width}x${height}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
      await page.setViewportSize({ width, height });
      await openSignup(page);

      const panel = await page.getByTestId('brand-panel').boundingBox();
      const section = await page.getByTestId('signup-section').boundingBox();
      const content = await page.getByTestId('signup-content').boundingBox();
      if (!panel || !section || !content) throw new Error('Layout not found');
      expect(panel.height).toBeGreaterThanOrEqual(height * 0.2);
      const left = content.x - section.x;
      const right = section.x + section.width - (content.x + content.width);
      expect(Math.abs(left - right)).toBeLessThanOrEqual(2);
    });
  }
});
