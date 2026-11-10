import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/tools/tracking';

const isPhone = (testInfo: { project: { name: string } }) => testInfo.project.name === 'phone';

async function open(page: Page, query = '') {
  await signIn(page);
  await page.goto(`${ROUTE}${query}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Order tracking' })).toBeVisible();
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, ROUTE);
  await expectSignedOutRedirect(page, `${ROUTE}?awb=DEMOEK001`);
});

test('shows the page title and sample label', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('empty-state')).toContainText('Enter an AWB');
  await page.goto(`${ROUTE}?awb=DEMOEK001`);
  await expect(page.getByTestId('tracking-card').getByText('Sample data')).toBeVisible();
});

test('shows the sample timeline for DEMOEK001', async ({ page }) => {
  await open(page, '?awb=DEMOEK001');
  const card = page.getByTestId('tracking-card');
  await expect(card.getByText('DEMOEK001').first()).toBeVisible();
  await expect(card.getByTestId('status-badge')).toContainText('In Transit');
  await expect(card.getByTestId('carrier-badge')).toContainText('Ekart');
  await expect(card.getByText('Latest location')).toBeVisible();
  const events = card.getByTestId('timeline-event');
  expect(await events.count()).toBeGreaterThan(1);
  // Newest first: the first event is the current status.
  await expect(events.first()).toContainText('In transit');
});

test('keeps the AWB in the URL', async ({ page }) => {
  await open(page);
  await page.getByLabel('AWB numbers').fill('DEMOEK001');
  await page.getByRole('button', { name: 'Track', exact: true }).click();
  await expect(page).toHaveURL(/\/tools\/tracking\?awb=DEMOEK001$/);
  await expect(page.getByTestId('tracking-card')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('AWB numbers')).toHaveValue('DEMOEK001');
  await expect(page.getByTestId('tracking-card')).toBeVisible();
});

test('shows a summary for several AWBs and opens each timeline', async ({ page }) => {
  await open(page, '?awb=DEMOEK001,%20DEMODL002%0ADEMOEK001');
  const items = page.getByTestId('tracking-item');
  await expect(items).toHaveCount(2);
  await expect(items.nth(1)).toContainText('DEMODL002');
  await expect(items.nth(0).getByTestId('timeline-event').first()).toBeHidden();
  await items.nth(0).getByText('Show timeline').click();
  await expect(items.nth(0).getByTestId('timeline-event').first()).toBeVisible();
});

test('says how many AWBs were shown when the list is cut', async ({ page }) => {
  const awbs = Array.from({ length: 12 }, (_, i) => `X${i}`).join(',');
  await open(page, `?awb=${awbs}`);
  await expect(page.getByTestId('tracking-item')).toHaveCount(10);
  await expect(page.getByText('Showing the first 10 of 12 AWBs.')).toBeVisible();
});

test('says no shipment found for an unknown AWB', async ({ page }) => {
  await open(page, '?awb=NOPE999,DEMOEK001');
  await expect(page.getByText('No shipment found for this AWB.')).toBeVisible();
  // The unknown AWB does not hide the known one.
  await expect(page.getByTestId('tracking-item').filter({ hasText: 'DEMOEK001' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
});

test('copies the public tracking link', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '?awb=DEMOEK001');
  await page.getByRole('button', { name: 'Share tracking link' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/^https?:\/\/[^/]+\/track\/DEMOEK001$/);
});

test('offers a selectable link when the clipboard is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
  });
  await open(page, '?awb=DEMOEK001');
  await page.getByRole('button', { name: 'Share tracking link' }).click();
  const field = page.getByLabel('Tracking link');
  await expect(field).toBeVisible();
  await expect(field).toHaveJSProperty('readOnly', true);
  await expect(field).toHaveValue(/\/track\/DEMOEK001$/);
  const selected = await field.evaluate((el: HTMLInputElement) =>
    el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0),
  );
  expect(selected).toMatch(/\/track\/DEMOEK001$/);
});

test('ignores bad URL input', async ({ page }) => {
  await open(page);
  for (const query of ['?awb=', '?awb=%20%2C%20', `?awb=${'A'.repeat(300)}`, '?page=abc&awb=DEMOEK001', '?awb=FOO']) {
    const response = await page.goto(`${ROUTE}${query}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Order tracking' })).toBeVisible();
  }
});

test('does not scroll sideways at any size', async ({ page }) => {
  await open(page, '?awb=DEMOEK001');
  await expectNoSidewaysScroll(page, SIZES);
  await page.goto(`${ROUTE}?awb=DEMOEK001,DEMODL002,NOPE999`);
  await expectNoSidewaysScroll(page, SIZES);
});

test('wraps long values', async ({ page }) => {
  await open(page, '?awb=ABCDEFGHIJ1234567890,ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOP');
  await expect(page.getByText('No shipment found for this AWB.').first()).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), 'Phone layout only');
  await open(page, '?awb=DEMOEK001');
  await expectTapTargets(page, [
    page.getByLabel('AWB numbers'),
    page.getByRole('button', { name: 'Track', exact: true }),
    page.getByRole('button', { name: 'Share tracking link' }),
  ]);
});

test('resets the search box after "Open on its own"', async ({ page }) => {
  await open(page);
  await page.getByLabel('AWB numbers').fill('DEMOEK001, DEMODL002');
  await page.getByRole('button', { name: 'Track', exact: true }).click();
  await expect(page.getByTestId('tracking-item')).toHaveCount(2);
  const second = page.getByTestId('tracking-item').nth(1);
  await second.getByText('Show timeline').click();
  await second.getByRole('link', { name: 'Open on its own' }).click();
  await expect(page).toHaveURL(/awb=DEMODL002$/);
  await expect(page.getByLabel('AWB numbers')).toHaveValue('DEMODL002');
});

test('empties the search box and results after Clear', async ({ page }) => {
  await open(page);
  await page.getByLabel('AWB numbers').fill('DEMOEK001');
  await page.getByRole('button', { name: 'Track', exact: true }).click();
  await expect(page.getByTestId('tracking-card')).toBeVisible();
  await page.getByRole('link', { name: 'Clear' }).click();
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('tracking-card')).toHaveCount(0);
  await expect(page.getByLabel('AWB numbers')).toHaveValue('');
});
