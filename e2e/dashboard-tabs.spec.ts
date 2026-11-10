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
    await page.goto('/dashboard?tab=ndr');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    for (const name of TABS.slice(2)) {
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
    // The sample list is shared by every test on the server, and the pickups spec schedules new
    // pickups for today, so the counts are checked as numbers, not exact values.
    await expect(card.getByTestId('tile-Scheduled today')).toContainText(/Scheduled today[1-9][0-9]*$/);
    await expect(card.getByTestId('tile-Picked up today')).toContainText(/Picked up today[0-9]+$/);
    await expect(card.getByTestId('tile-Pending pickup')).toBeVisible();
    await expect(card.getByRole('img', { name: /^Pickups in the last 7 days\./ })).toBeVisible();
    await expect(card.locator('[data-bar]')).toHaveCount(7);
    await expect(card.getByRole('table')).toHaveCount(1);
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
