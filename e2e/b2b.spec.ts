import { randomUUID } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const B2B = '/orders/b2b';

function rows(page: Page, projectName: string) {
  return projectName === 'phone' ? page.getByTestId('b2b-item') : page.getByTestId('b2b-row');
}

async function open(page: Page, route = B2B) {
  await signIn(page);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: 'B2B Shipments' })).toBeVisible();
}

function dialog(page: Page) {
  return page.getByRole('dialog', { name: 'Create B2B shipment' });
}

async function openDialog(page: Page) {
  await page.getByRole('button', { name: 'Create B2B shipment' }).click();
  await expect(dialog(page)).toBeVisible();
  return dialog(page);
}

async function fillBox(row: Locator, box: { l: string; w: string; h: string; kg: string; count: string }) {
  await row.getByLabel('Length (cm)').fill(box.l);
  await row.getByLabel('Width (cm)').fill(box.w);
  await row.getByLabel('Height (cm)').fill(box.h);
  await row.getByLabel('Weight (kg)').fill(box.kg);
  await row.getByLabel('Count').fill(box.count);
}

async function fillConsignee(form: Locator, name: string) {
  await form.getByLabel('Consignee name').fill(name);
  await form.getByLabel('Phone').fill('9822000000');
  await form.getByLabel('Address line 1').fill('1 Test Road');
  await form.getByLabel('City').fill('Pune');
  await form.getByLabel('State').fill('Maharashtra');
  await form.getByLabel('Pincode').fill('411001');
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, B2B);
});

test('wraps long values', async ({ page }, testInfo) => {
  await open(page);
  // The first sample row has a very long consignee name and an invoice of over ₹1,00,00,000.
  // Desktop and phone runs share one sample store, so find the row by its LR number.
  await page.goto(`${B2B}?search=LR20260001`);
  const long = rows(page, testInfo.project.name);
  await expect(long).toContainText('Bharatiya Rashtriya Audyogik');
  await expect(long).toContainText('₹1,00,00,123.45');
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  await expectNoSidewaysScroll(page, [{ width: 1024, height: 768 }]);
  await page.goto(`${B2B}?search=${'x'.repeat(100)}`);
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test.describe('B2B shipments', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('B2B Shipments');
    await expect(page.getByTestId('b2b-card').getByText('Sample data')).toBeVisible();
  });

  test('lists shipments 20 per page', async ({ page }, testInfo) => {
    const list = rows(page, testInfo.project.name);
    await expect(list).toHaveCount(20);
    await page.getByRole('link', { name: 'Next page' }).click();
    await page.waitForURL('**page=2');
    expect(await list.count()).toBeGreaterThanOrEqual(2);
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
  });

  test('shows every column on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop table');
    for (const name of [
      'LR number',
      'Consignee',
      'Destination',
      'Boxes',
      'Total weight',
      'Invoice value',
      'Carrier',
      'Status',
      'Created',
    ]) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
  });

  test('searches by consignee or LR number', async ({ page }, testInfo) => {
    const list = rows(page, testInfo.project.name);
    await page.getByLabel('Search by LR number or consignee').fill('shree textiles');
    await page.getByRole('button', { name: 'Search' }).click();
    await page.waitForURL('**search=shree*');
    await expect(list.first()).toContainText('Shree Textiles');

    await page.goto(`${B2B}?search=LR20260001`);
    await expect(list).toHaveCount(1);
  });

  test('shows an empty state', async ({ page }) => {
    await page.goto(`${B2B}?search=zzzz-no-match`);
    await expect(page.getByText('No B2B shipments yet.')).toBeVisible();
  });

  test('ignores bad URL input', async ({ page }, testInfo) => {
    for (const query of ['?page=abc', '?page=-1', '?page=999', `?search=${'q'.repeat(300)}`]) {
      const response = await page.goto(`${B2B}${query}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: 'B2B Shipments' })).toBeVisible();
      if (!query.startsWith('?search')) {
        await expect(rows(page, testInfo.project.name).first()).toBeVisible();
      }
      await expect(page.getByText('Could not reach')).toHaveCount(0);
    }
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone check');
    await expectTapTargets(page, [
      page.getByRole('button', { name: 'Create B2B shipment' }),
      page.getByLabel('Search by LR number or consignee'),
      page.getByRole('button', { name: 'Search' }),
      page.getByTestId('b2b-item').first(),
    ]);
    const form = await openDialog(page);
    await expectTapTargets(page, [
      form.getByLabel('Consignee name'),
      form.getByLabel('Length (cm)'),
      form.getByRole('button', { name: 'Add box' }),
      form.getByLabel('Invoice number'),
      form.getByRole('button', { name: 'Create shipment' }),
    ]);
  });
});

test.describe('create dialog', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('totals box weight live', async ({ page }) => {
    const form = await openDialog(page);
    await fillBox(form.getByTestId('box-row').first(), { l: '40', w: '30', h: '20', kg: '2.5', count: '4' });
    await expect(form.getByTestId('total-weight')).toHaveText('Total weight: 10 kg');

    await form.getByRole('button', { name: 'Add box' }).click();
    await expect(form.getByTestId('box-row')).toHaveCount(2);
    await fillBox(form.getByTestId('box-row').nth(1), { l: '50', w: '50', h: '50', kg: '10', count: '1' });
    await expect(form.getByTestId('total-weight')).toHaveText('Total weight: 20 kg');

    await form.getByRole('button', { name: 'Remove box 2' }).click();
    await expect(form.getByTestId('box-row')).toHaveCount(1);
    await expect(form.getByTestId('total-weight')).toHaveText('Total weight: 10 kg');
    await expect(form.getByRole('button', { name: 'Remove box 1' })).toBeDisabled();
  });

  test('warns about e-way bills above ₹50,000', async ({ page }) => {
    const form = await openDialog(page);
    const warning = form.getByText('An e-way bill is needed for invoices over ₹50,000.');
    await form.getByLabel('Invoice value (₹)').fill('50000');
    await expect(warning).toBeHidden();
    await form.getByLabel('Invoice value (₹)').fill('50000.01');
    await expect(warning).toBeVisible();
  });

  test('shows what needs fixing and keeps the dialog open', async ({ page }) => {
    const form = await openDialog(page);
    await form.getByRole('button', { name: 'Create shipment' }).click();
    await expect(form.getByRole('alert')).toContainText('Some fields need attention.');
    await expect(form.getByText('Enter the invoice number.')).toBeVisible();
    await expect(dialog(page)).toBeVisible();
  });

  test('adds a created shipment to the sample list', async ({ page }, testInfo) => {
    // Desktop and phone runs share one sample store, so each test uses its own name.
    const name = `Test Buyer ${randomUUID().slice(0, 8)}`;
    const form = await openDialog(page);
    await fillConsignee(form, name);
    await fillBox(form.getByTestId('box-row').first(), { l: '40', w: '30', h: '20', kg: '2.5', count: '4' });
    await form.getByLabel('Invoice number').fill('INV-77');
    await form.getByLabel('Invoice value (₹)').fill('12500');
    await form.getByRole('button', { name: 'Create shipment' }).click();

    await expect(dialog(page)).toBeHidden();
    await expect(page.getByRole('status').getByText(/created/i)).toBeVisible();

    await page.goto(`${B2B}?search=${encodeURIComponent(name)}`);
    const row = rows(page, testInfo.project.name);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(name);
    await expect(row).toContainText('Pune');
    await expect(row).toContainText('10 kg');
    await expect(row).toContainText('₹12,500.00');
  });
});
