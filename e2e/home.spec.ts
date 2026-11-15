import { expect, test, type Page } from '@playwright/test';
import { fillDetails, openLogin, signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const HOME = '/home';

async function open(page: Page) {
  await signIn(page);
  await page.goto(HOME);
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, HOME);
});

test('wraps long values', async ({ page }) => {
  const email = `${'a-very-long-merchant-name-'.repeat(4)}ops@example.com`;
  await openLogin(page);
  await page.getByRole('tab', { name: 'Email + Password' }).click();
  await fillDetails(page, email);
  await page.locator('input[name="password"]').fill('demo-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.goto(HOME);
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();

  await expect(page.getByText(/^Welcome, a-very-long/)).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test.describe('home', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
    for (const id of ['stat-wallet', 'stat-in-transit', 'stat-ndr', 'stat-delivered', 'checklist-card', 'recent-shipments-card']) {
      await expect(page.getByTestId(id).getByText('Sample data')).toBeVisible();
    }
  });

  test('greets the merchant by name', async ({ page }) => {
    await expect(page.getByText('Welcome, ops', { exact: true })).toBeVisible();
  });

  test('shows the four stat tiles', async ({ page }) => {
    await expect(page.getByTestId('stat-wallet')).toContainText('Wallet Balance');
    await expect(page.getByTestId('stat-wallet')).toContainText('₹12,500.00');
    await expect(page.getByTestId('stat-in-transit')).toContainText('In Transit');
    await expect(page.getByTestId('stat-ndr')).toContainText('NDR Action Required');
    await expect(page.getByTestId('stat-delivered')).toContainText('Delivered');
  });

  test('links each quick action to its screen', async ({ page }) => {
    const actions = page.getByTestId('quick-actions');
    for (const [name, href] of [
      ['Create Shipment', '/orders/create'],
      ['Track a Shipment', '/tools/tracking'],
      ['Recharge Wallet', '/finances/wallet?recharge=1'],
      ['Rate Calculator', '/tools/rate-calculator'],
    ]) {
      await expect(actions.getByRole('link', { name })).toHaveAttribute('href', href!);
    }
  });

  test('shows two of four setup steps done', async ({ page }) => {
    const card = page.getByTestId('checklist-card');

    await expect(card.getByText('2 of 4 done')).toBeVisible();
    await expect(card.getByRole('link', { name: 'Complete KYC' })).toHaveAttribute('href', '/settings/company');
    await expect(card.getByRole('link', { name: 'Add a pickup address' })).toHaveAttribute('href', '/settings/pickup-addresses');
    await expect(card.getByRole('link', { name: 'Create your first shipment' })).toHaveAttribute('href', '/orders/create');
  });

  test('opens a recent shipment', async ({ page }) => {
    const rows = page.getByTestId('recent-shipment');

    await expect(rows).toHaveCount(5);
    await expect(rows.first()).toHaveAttribute('href', /\/orders\/DEMO/);
    await rows.first().click();
    await expect(page).toHaveURL(/\/orders\/DEMO/);
  });

  test('keeps the wallet amount and quick action names on one line at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const amount = page.getByTestId('stat-wallet').getByText('₹12,500.00');
    expect((await amount.boundingBox())?.height ?? 99).toBeLessThan(36);
    const label = page.getByTestId('quick-actions').getByText('Rate Calculator');
    expect((await label.boundingBox())?.height ?? 99).toBeLessThan(24);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'phone only');
    const links = [
      ...(await page.getByTestId('quick-actions').getByRole('link').all()),
      ...(await page.getByTestId('checklist-card').getByRole('link').all()),
      ...(await page.getByTestId('recent-shipment').all()),
    ];
    await expectTapTargets(page, links);
  });

  test('puts tiles two per row and quick actions in a 2x2 grid on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone', 'phone only');
    const tiles = await page.locator('[data-testid^="stat-"]').evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().top)),
    );
    expect(new Set(tiles).size).toBe(2);
    const actions = await page.getByTestId('quick-actions').getByRole('link').evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().top)),
    );
    expect(new Set(actions).size).toBe(2);
  });
});
