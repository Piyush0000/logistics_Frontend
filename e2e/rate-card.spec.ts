import { CARRIERS } from '@logicore/contracts';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/tools/rate-card';
const ZONES = ['A', 'B', 'C', 'D', 'E'];
const LABELS: Record<string, string> = {
  delhivery: 'Delhivery',
  shadowfax: 'Shadowfax',
  bluedart: 'Blue Dart',
  dhl: 'DHL',
  ekart: 'Ekart',
};

const isPhone = (testInfo: { project: { name: string } }) => testInfo.project.name === 'phone';
const listItems = (page: Page, phone: boolean) => page.getByTestId(phone ? 'rate-item' : 'rate-row');
const fullCount = (phone: boolean) => (phone ? CARRIERS.length : CARRIERS.length * ZONES.length);

async function open(page: Page, route = ROUTE) {
  await signIn(page);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: 'Rate card' })).toBeVisible();
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, ROUTE);
});

test('shows the page title and sample label', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('rates-card').getByText('Sample data')).toBeVisible();
});

test('does not scroll sideways at any size', async ({ page }) => {
  await open(page);
  await expectNoSidewaysScroll(page, SIZES);
});

test('wraps long values', async ({ page }) => {
  // The rates hold no free text, so the widest figures stand in for a long value.
  await open(page);
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), 'Phone layout only');
  await open(page);
  await expectTapTargets(page, [
    page.getByRole('button', { name: /^Carrier/ }),
    page.getByRole('button', { name: 'Apply' }),
    page.getByRole('link', { name: 'Clear' }),
  ]);
});

test('shows a row for every carrier and zone in the sample', async ({ page }, testInfo) => {
  await open(page);
  if (isPhone(testInfo)) {
    const items = page.getByTestId('rate-item');
    await expect(items).toHaveCount(CARRIERS.length);
    for (const carrier of CARRIERS) {
      const item = items.filter({ hasText: LABELS[carrier] ?? carrier });
      await expect(item).toHaveCount(1);
      for (const zone of ZONES) {
        await expect(item.getByTestId('rate-line').filter({ hasText: `Zone ${zone}` })).toHaveCount(1);
      }
    }
  } else {
    const rows = page.getByTestId('rate-row');
    await expect(rows).toHaveCount(CARRIERS.length * ZONES.length);
    for (const carrier of CARRIERS) {
      for (const zone of ZONES) {
        await expect(rows.filter({ hasText: LABELS[carrier] ?? carrier }).filter({ hasText: `Zone ${zone}` })).toHaveCount(1);
      }
    }
  }
});

test('shows the price columns on desktop', async ({ page }, testInfo) => {
  test.skip(isPhone(testInfo), 'Desktop table only');
  await open(page);
  const table = page.getByRole('table', { name: 'Rate card' });
  for (const heading of ['Zone', 'Courier', 'Base price', 'Each extra 500 g', 'COD fee']) {
    await expect(table.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
  }
  // Delhivery, zone A: 35 rupees for the first 0.5 kg, 12 for each extra 500 g, 2% COD with a 10 rupee minimum.
  const row = page.getByTestId('rate-row').filter({ hasText: 'Delhivery' }).filter({ hasText: 'Zone A' });
  await expect(row).toContainText('₹35.00');
  await expect(row).toContainText('first 0.5 kg');
  await expect(row).toContainText('₹12.00');
  await expect(row).toContainText('2% of the order');
  await expect(row).toContainText('minimum ₹10.00');
});

test('shows money and COD fee in cards on phones', async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), 'Phone cards only');
  await open(page);
  const line = page
    .getByTestId('rate-item')
    .filter({ hasText: 'DHL' })
    .getByTestId('rate-line')
    .filter({ hasText: 'Zone A' });
  await expect(line).toContainText('₹75.00');
  await expect(line).toContainText('₹30.00');
  await expect(line).toContainText('2.5% of the order');
});

test('filters to one carrier', async ({ page }, testInfo) => {
  const phone = isPhone(testInfo);
  await open(page);
  await page.getByRole('button', { name: /^Carrier/ }).click();
  await expect(page.getByRole('option')).toHaveText(['All carriers', ...CARRIERS.map((c) => LABELS[c] ?? c)]);
  await page.getByRole('option', { name: 'DHL' }).click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/carrier=dhl/);

  await expect(listItems(page, phone)).toHaveCount(phone ? 1 : ZONES.length);
  await expect(listItems(page, phone).filter({ hasNotText: 'DHL' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Clear' }).click();
  await expect(page).not.toHaveURL(/carrier=/);
  await expect(listItems(page, phone)).toHaveCount(fullCount(phone));
});

test('explains each zone', async ({ page }) => {
  await open(page);
  const legend = page.getByTestId('zone-legend');
  await expect(legend.getByTestId('zone-entry')).toHaveCount(ZONES.length);
  for (const name of ['Within city', 'Within state', 'Metro to metro', 'Rest of India', 'Special']) {
    await expect(legend.getByText(name, { exact: true })).toBeVisible();
  }
  for (const zone of ZONES) await expect(legend.getByText(`Zone ${zone}`, { exact: true })).toBeVisible();
});

test('ignores bad URL input', async ({ page }, testInfo) => {
  const phone = isPhone(testInfo);
  await signIn(page);
  for (const query of ['page=abc', 'page=-1', 'carrier=FOO', `q=${'x'.repeat(300)}`, `carrier=${'x'.repeat(300)}`]) {
    await page.goto(`${ROUTE}?${query}`);
    await expect(listItems(page, phone)).toHaveCount(fullCount(phone));
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  }
});
