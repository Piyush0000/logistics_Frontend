import { expect, test } from '@playwright/test';
import { expectNoSidewaysScroll, SIZES } from './screen-checks';

const ROUTE = '/track/DEMOEK001';

test('opens without signing in', async ({ page }) => {
  const response = await page.goto(ROUTE);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/track\/DEMOEK001$/);
  await expect(page.getByRole('heading', { level: 1, name: 'DEMOEK001' })).toBeVisible();
  await expect(page.getByTestId('status-badge')).toContainText('In Transit');
  await expect(page.getByTestId('carrier-badge')).toContainText('Ekart');
  await expect(page.getByTestId('stage-progress')).toBeVisible();
  expect(await page.getByTestId('timeline-event').count()).toBeGreaterThan(1);
  await expect(page.getByRole('navigation')).toHaveCount(0);
});

test('shows no personal details', async ({ page }) => {
  await page.goto(ROUTE);
  await expect(page.getByTestId('timeline-event').first()).toBeVisible();
  const text = (await page.locator('body').innerText()) + (await page.content());
  for (const secret of ['Aditi', 'Rao', '9988776655', '9876543210', 'Green Glen', 'Electronic City', '560103', 'Rs', '₹']) {
    expect(text, `page mentions ${secret}`).not.toContain(secret);
  }
});

test('tells robots not to index', async ({ page }) => {
  await page.goto(ROUTE);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /nofollow/);
});

test('shows the not-found page for an unknown AWB', async ({ page }) => {
  const response = await page.goto('/track/NOPE12345');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'We could not find that shipment' })).toBeVisible();
  const long = await page.goto(`/track/${'A'.repeat(300)}`);
  expect(long?.status()).toBe(404);
});

test('fits a 320px screen', async ({ page }) => {
  await page.goto(ROUTE);
  await expect(page.getByTestId('stage-progress')).toBeVisible();
  await expectNoSidewaysScroll(page, SIZES);
  await page.setViewportSize({ width: 320, height: 568 });
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});
