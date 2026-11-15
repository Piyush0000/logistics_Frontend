import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/tools/rate-calculator';

const isPhone = (testInfo: { project: { name: string } }) => testInfo.project.name === 'phone';

interface Details {
  from?: string;
  to?: string;
  weight?: string;
  length?: string;
  width?: string;
  height?: string;
  cod?: string;
}

async function open(page: Page) {
  await signIn(page);
  await page.goto(ROUTE);
  await expect(page.getByRole('heading', { level: 1, name: 'Rate calculator' })).toBeVisible();
}

async function fill(page: Page, d: Details = {}) {
  await page.getByLabel('Pickup pincode').fill(d.from ?? '110001');
  await page.getByLabel('Delivery pincode').fill(d.to ?? '110045');
  await page.getByLabel('Weight (kg)').fill(d.weight ?? '1');
  await page.getByLabel('Length (cm)').fill(d.length ?? '10');
  await page.getByLabel('Width (cm)').fill(d.width ?? '10');
  await page.getByLabel('Height (cm)').fill(d.height ?? '10');
  if (d.cod !== undefined) {
    await page.getByRole('radio', { name: 'Cash on delivery' }).check();
    await page.getByLabel('COD amount (₹)').fill(d.cod);
  }
}

const submit = (page: Page) => page.getByRole('button', { name: 'Get quotes' }).click();
const quoteFor = (page: Page, name: string) => page.getByTestId('quote-item').filter({ hasText: name });

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, ROUTE);
});

test('shows the page title and sample label', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('quotes-card')).toContainText('Enter the details above');
  await fill(page);
  await submit(page);
  await expect(page.getByTestId('quotes-card').getByText('Sample data')).toBeVisible();
  await expect(page.getByTestId('quote-item')).toHaveCount(5);
});

test('does not scroll sideways at any size', async ({ page }) => {
  await open(page);
  await fill(page);
  await submit(page);
  await expect(page.getByTestId('quote-item')).toHaveCount(5);
  await expectNoSidewaysScroll(page, SIZES);
});

test('wraps long values', async ({ page }) => {
  await open(page);
  await fill(page, { weight: '1000', length: '500', width: '500', height: '500', cod: '10000000' });
  await submit(page);
  await expect(page.getByTestId('quote-item')).toHaveCount(5);
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), 'Phone layout only');
  await open(page);
  await fill(page, { cod: '500' });
  await expectTapTargets(page, [
    page.getByLabel('Pickup pincode'),
    page.getByLabel('Delivery pincode'),
    page.getByLabel('Weight (kg)'),
    page.getByLabel('Length (cm)'),
    page.getByLabel('COD amount (₹)'),
    page.getByText('Prepaid', { exact: true }),
    page.getByText('Cash on delivery', { exact: true }),
    page.getByRole('button', { name: 'Get quotes' }),
  ]);
  await submit(page);
  await expectTapTargets(page, [page.getByRole('link', { name: 'Ship with this' }).first()]);
});

test('rejects pincode 012345', async ({ page }) => {
  await open(page);
  await fill(page, { from: '012345' });
  await submit(page);
  await expect(page.getByText('Enter a 6-digit pincode that does not start with 0.')).toBeVisible();
  await expect(page.getByTestId('quote-item')).toHaveCount(0);
});

test('requires a COD amount for COD', async ({ page }) => {
  await open(page);
  await fill(page, { cod: '' });
  await submit(page);
  await expect(page.getByText('Enter the amount to collect, above 0 rupees.')).toBeVisible();
  await expect(page.getByTestId('quote-item')).toHaveCount(0);
  // Prepaid needs no amount.
  await page.getByRole('radio', { name: 'Prepaid' }).check();
  await expect(page.getByLabel('COD amount (₹)')).toHaveCount(0);
  await submit(page);
  await expect(page.getByTestId('quote-item')).toHaveCount(5);
});

test('sorts quotes cheapest first and unserviceable last', async ({ page }) => {
  await open(page);
  // Zone D with a destination Shadowfax does not reach.
  await fill(page, { to: '790001' });
  await submit(page);
  const items = page.getByTestId('quote-item');
  await expect(items).toHaveCount(5);
  await expect(items.getByTestId('carrier-badge')).toHaveText(['Ekart', 'Delhivery', 'Blue Dart', 'DHL', 'Shadowfax']);
  await expect(items.nth(0)).toContainText('₹75.00');
  await expect(items.nth(1)).toContainText('₹77.00');
  await expect(items.nth(4)).toContainText('Not serviceable');
  await expect(items.nth(4).getByRole('link', { name: 'Ship with this' })).toHaveCount(0);
});

test('shows the COD fee and that DHL has no COD', async ({ page }) => {
  await open(page);
  await fill(page, { cod: '1000' });
  await submit(page);
  // Delhivery zone A, 1 kg: 47.00 plus 2% of 1,000.
  await expect(quoteFor(page, 'Delhivery')).toContainText('₹67.00');
  await expect(quoteFor(page, 'DHL')).toContainText('Not serviceable');
  await expect(quoteFor(page, 'DHL')).toContainText('does not offer cash on delivery');
});

test('uses chargeable weight in the quote', async ({ page }) => {
  await open(page);
  // 50 x 30 x 20 cm is 6 kg by volume, which is more than the 0.5 kg on the scale.
  await fill(page, { weight: '0.5', length: '50', width: '30', height: '20' });
  await submit(page);
  await expect(page.getByTestId('quote-item')).toHaveCount(5);
  for (const item of await page.getByTestId('quote-item').all()) {
    await expect(item).toContainText('Chargeable weight 6 kg');
  }
  await expect(quoteFor(page, 'Delhivery')).toContainText('₹167.00');
});

test('links a quote to Create Shipment with the carrier', async ({ page }) => {
  await open(page);
  await fill(page);
  await submit(page);
  const link = quoteFor(page, 'Blue Dart').getByRole('link', { name: 'Ship with this' });
  await expect(link).toHaveAttribute('href', '/orders/create?carrier=bluedart');
  await link.click();
  await expect(page).toHaveURL(/\/orders\/create\?carrier=bluedart$/);
});
