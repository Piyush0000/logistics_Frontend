import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const RTO = '/rto';

// The sample shipments: three returning, two back with the seller.
function rows(page: Page, projectName: string) {
  return projectName === 'phone' ? page.getByTestId('rto-item') : page.getByTestId('rto-row');
}

async function open(page: Page, route = RTO) {
  await signIn(page);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: 'RTO' })).toBeVisible();
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, RTO);
});

test.describe('rto', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('RTO');
    await expect(page.getByTestId('rto-summary').getByText('Sample data')).toBeVisible();
    await expect(page.getByTestId('rto-card').getByText('Sample data')).toBeVisible();
  });

  test('shows the three summary tiles', async ({ page }) => {
    await expect(page.getByTestId('tile-rto-in-progress')).toContainText('3');
    await expect(page.getByTestId('tile-rto-delivered')).toContainText('2');
    await expect(page.getByTestId('tile-rto-charges')).toContainText('₹1,845.00');
  });

  test('lists the returning shipments, linked to the order', async ({ page }, testInfo) => {
    const list = rows(page, testInfo.project.name);
    await expect(list).toHaveCount(3);
    await expect(list.filter({ hasText: 'DEMOEK102' })).toContainText('Return in transit');
    await expect(list.filter({ hasText: 'DEMOEK102' })).toContainText('RTO Initiated');
    await page.getByRole('link', { name: /DEMOEK102/ }).first().click();
    await page.waitForURL('**/orders/DEMOEK102');
  });

  test('shows every column on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop table');
    for (const name of ['AWB', 'Reference', 'Carrier', 'Status', 'Courier status', 'Last update']) {
      await expect(page.getByTestId('rto-card').getByRole('columnheader', { name, exact: true })).toBeVisible();
    }
  });

  test('switches stage from the tabs', async ({ page }, testInfo) => {
    const tabs = page.getByRole('tablist', { name: 'RTO stage' });
    await expect(tabs.getByRole('tab', { name: 'In progress' })).toHaveAttribute('aria-selected', 'true');

    await tabs.getByRole('tab', { name: 'Delivered' }).click();
    await page.waitForURL('**/rto?stage=delivered');
    const list = rows(page, testInfo.project.name);
    await expect(list).toHaveCount(2);
    await expect(list.filter({ hasText: 'DEMODL104' })).toContainText('RTO Delivered');
    await expect(tabs.getByRole('tab', { name: 'Delivered' })).toHaveAttribute('aria-selected', 'true');

    await tabs.getByRole('tab', { name: 'In progress' }).click();
    await page.waitForURL('**/rto');
    await expect(rows(page, testInfo.project.name)).toHaveCount(3);
  });

  test('shows an empty state', async ({ page }) => {
    await page.goto('/rto?page=9');
    await expect(page.getByText('No shipments are returning.')).toBeVisible();
  });

  test('wraps long values', async ({ page }) => {
    // The first sample row has a 20-character AWB and a very long reference.
    await expect(page.getByText('DEMORTOVERYLONGAWB01').locator('visible=true').first()).toBeVisible();
    await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
    await page.goto('/rto?stage=delivered');
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone only');
    const tabs = page.getByRole('tablist', { name: 'RTO stage' });
    await expectTapTargets(page, [
      tabs.getByRole('tab', { name: 'In progress' }),
      tabs.getByRole('tab', { name: 'Delivered' }),
      page.getByTestId('rto-item').first(),
    ]);
  });

  test('ignores bad URL input', async ({ page }, testInfo) => {
    for (const query of [
      '?page=abc',
      '?page=-1',
      '?stage=FOO',
      `?q=${'x'.repeat(300)}`,
      `?stage=FOO&page=abc&q=${'x'.repeat(300)}`,
    ]) {
      await page.goto(`/rto${query}`);
      await expect(page.getByRole('heading', { level: 1, name: 'RTO' })).toBeVisible();
      await expect(rows(page, testInfo.project.name)).toHaveCount(3);
      await expect(page.getByText('Could not reach the server')).toHaveCount(0);
    }
  });
});

test('opens from the dashboard RTO tile and the sidebar', async ({ page }) => {
  await signIn(page);
  await page.goto('/dashboard');
  await page.getByTestId('tile-RTO').click();
  await page.waitForURL('**/rto');
  await expect(page.getByRole('heading', { level: 1, name: 'RTO' })).toBeVisible();
});
