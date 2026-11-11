import { expect, test } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectTapTargets, SIZES } from './screen-checks';

const TABS = ['Overview', 'Pickups', 'NDR', 'RTO', 'Delivered', 'Revenue', 'SMS'];

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test.describe('dashboard tabs', () => {
  test('opens a tab from the URL', async ({ page }) => {
    await page.goto('/dashboard?tab=pickups');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
    await expect(page.getByRole('tab', { name: 'Pickups' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tab', { name: 'Pickups' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('pickups-card')).toBeVisible();
    await expect(page.getByTestId('kpi-cards')).toBeHidden();
  });

  test('moves between Overview and Pickups with the tab links', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Pickups' })).toHaveAttribute('href', '/dashboard?tab=pickups');
    await page.getByRole('tab', { name: 'Pickups' }).click();
    await expect(page).toHaveURL(/\/dashboard\?tab=pickups$/);
    await expect(page.getByTestId('pickups-card')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('href', '/dashboard');
    await page.getByRole('tab', { name: 'Overview' }).click();
    await expect(page.getByTestId('kpi-cards')).toBeVisible();
  });

  test('ignores an unknown tab', async ({ page }) => {
    await page.goto('/dashboard?tab=FOO');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('kpi-cards')).toBeVisible();
  });

  test('keeps tabs that are not built disabled', async ({ page }) => {
    await page.goto('/dashboard?tab=delivered');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    for (const name of TABS.slice(4)) {
      await expect(page.getByRole('tab', { name })).toBeDisabled();
    }
  });
});

test.describe('pickups tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=pickups');
    await expect(page.getByTestId('pickups-card')).toBeVisible();
  });

  test('shows the tiles, the sample label and a 7-day chart', async ({ page }) => {
    const card = page.getByTestId('pickups-card');
    await expect(card.getByText('Sample data')).toBeVisible();
    await expect(card.getByTestId('tile-Scheduled today')).toBeVisible();
    await expect(card.getByTestId('tile-Picked up today')).toBeVisible();
    await expect(card.getByTestId('tile-Pending pickup')).toBeVisible();
    await expect(card.getByRole('img', { name: /^Pickups in the last 7 days\./ })).toBeVisible();
    await expect(card.locator('[data-bar]')).toHaveCount(7);
    await expect(card.getByRole('table')).toHaveCount(1);
  });

  test('keeps the tiles, the chart and the pickups page consistent in one render', async ({ page, context }, testInfo) => {
    // Other specs add pickups to the shared sample list, so only relations that hold within one
    // render are checked here. Exact values are covered by the summarizePickups unit tests.
    const card = page.getByTestId('pickups-card');
    const tile = async (name: string) => {
      const text = (await card.getByTestId(`tile-${name}`).innerText()).replace(name, '');
      const match = text.match(/\d+/);
      expect(match, `${name} tile shows a whole number`).not.toBeNull();
      return Number(match![0]);
    };
    const scheduled = await tile('Scheduled today');
    const pickedUp = await tile('Picked up today');
    const pending = await tile('Pending pickup');

    const values = await card.locator('table tbody tr td').allInnerTexts();
    expect(values).toHaveLength(7);
    for (const value of values) expect(value).toMatch(/^\d+$/);
    expect(Number(values[6])).toBe(scheduled + pickedUp);

    // Open the pickups page in the same test and compare Pending with its Ready to ship list.
    const other = await context.newPage();
    await other.goto('/orders/pickups');
    const rows = testInfo.project.name === 'phone' ? other.getByTestId('ready-item') : other.getByTestId('ready-row');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBe(pending);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps the chart inside its card at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const card = await page.getByTestId('pickups-card').boundingBox();
    const chart = await page.getByRole('img', { name: /^Pickups in the last 7 days/ }).boundingBox();
    expect(chart!.x + chart!.width).toBeLessThanOrEqual(card!.x + card!.width);
    expect(chart!.width).toBeGreaterThan(200);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    await expectTapTargets(page, [
      page.getByRole('tab', { name: 'Overview' }),
      page.getByRole('tab', { name: 'Pickups' }),
    ]);
  });
});

test.describe('NDR tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=ndr');
    await expect(page.getByTestId('ndr-tab-card')).toBeVisible();
  });

  test('NDR tab shows reasons and links to NDR', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
    await expect(page.getByRole('tab', { name: 'NDR' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'NDR' })).toHaveAttribute('href', '/dashboard?tab=ndr');
    const card = page.getByTestId('ndr-tab-card');
    await expect(card.getByText('Sample data')).toBeVisible();
    for (const label of ['NDR Order', 'Re-attempted', 'NDR Delivered', 'NDR Returned']) {
      await expect(card.getByTestId(`tile-${label}`)).toBeVisible();
    }
    await expect(card.getByRole('img', { name: /^NDR reasons\./ })).toBeVisible();
    expect(await card.locator('[data-bar]').count()).toBeGreaterThan(0);
    await expect(page.getByTestId('kpi-cards')).toBeHidden();
    await card.getByRole('link', { name: 'View all NDR' }).click();
    await page.waitForURL('**/ndr');
  });

  test('keeps the full reason in the chart table and bar titles', async ({ page }) => {
    const card = page.getByTestId('ndr-tab-card');
    await expect(card.getByRole('columnheader', { name: 'Reason' })).toHaveCount(1);
    await expect(card.getByRole('rowheader', { name: 'Door locked / Premise closed' })).toHaveCount(1);
    await expect(card.locator('[data-bar] title', { hasText: 'Customer refused delivery (COD amount mismatch)' })).toHaveCount(1);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    await expectTapTargets(page, [
      page.getByRole('tab', { name: 'NDR' }),
      page.getByRole('link', { name: 'View all NDR' }),
    ]);
  });
});

test.describe('RTO tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=rto');
    await expect(page.getByTestId('rto-tab-card')).toBeVisible();
  });

  test('charts as many shipments as the tiles count', async ({ page }) => {
    const card = page.getByTestId('rto-tab-card');
    const tile = async (name: string) =>
      Number((await card.getByTestId(`tile-${name}`).innerText()).match(/\d+/)![0]);
    const values = await card.locator('table tbody tr td').allInnerTexts();
    const chartTotal = values.reduce((sum, v) => sum + Number(v), 0);
    expect(chartTotal).toBe((await tile('RTO in progress')) + (await tile('RTO delivered')));
  });

  test('shows counts, a courier chart and a link to RTO', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'RTO' })).toHaveAttribute('aria-selected', 'true');
    const card = page.getByTestId('rto-tab-card');
    await expect(card.getByText('Sample data')).toBeVisible();
    await expect(card.getByTestId('tile-RTO in progress')).toContainText('3');
    await expect(card.getByTestId('tile-RTO delivered')).toContainText('2');
    await expect(card.getByRole('img', { name: /^RTO by courier\./ })).toBeVisible();
    await expect(card.locator('[data-bar]')).toHaveCount(4);
    await expect(card.getByRole('columnheader', { name: 'Courier' })).toHaveCount(1);
    await expect(card.getByTestId('rto-chart-note')).toHaveCount(0);
    await card.getByRole('link', { name: 'View all RTO' }).click();
    await page.waitForURL('**/rto');
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    await expectTapTargets(page, [
      page.getByRole('tab', { name: 'RTO' }),
      page.getByRole('link', { name: 'View all RTO' }),
    ]);
  });
});
