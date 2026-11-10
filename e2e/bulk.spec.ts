import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { BULK_COLUMNS } from '../src/lib/bulk-shipments';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const BULK = '/orders/bulk';
const HEADER = BULK_COLUMNS.join(',');

function row(overrides: Record<string, string> = {}): string {
  const base: Record<string, string> = {
    origin_name: 'Central Hub',
    origin_phone: '9876543210',
    origin_line1: '42 Industrial Road',
    origin_city: 'Bengaluru',
    origin_state: 'Karnataka',
    origin_pincode: '560100',
    destination_name: 'Aditi Rao',
    destination_phone: '9988776655',
    destination_line1: 'Flat 302 Green Glen',
    destination_line2: '',
    destination_city: 'Bengaluru',
    destination_state: 'Karnataka',
    destination_pincode: '560103',
    weight_kg: '1.2',
    length_cm: '25',
    width_cm: '15',
    height_cm: '10',
    item_name: 'Keyboard',
    item_quantity: '1',
    item_unit_price: '3499',
    payment_type: 'PREPAID',
    cod_amount: '0',
    reference_id: `BULK-${randomUUID().slice(0, 8)}`,
    preferred_carrier: '',
  };
  return BULK_COLUMNS.map((column) => overrides[column] ?? base[column]).join(',');
}

function file(name: string, ...rows: string[]) {
  return {
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from([HEADER, ...rows].join('\r\n') + '\r\n'),
  };
}

async function open(page: Page) {
  await signIn(page);
  await page.goto(BULK);
  await expect(page.getByRole('heading', { level: 1, name: 'Bulk Upload' })).toBeVisible();
}

function previewRows(page: Page, projectName: string) {
  return projectName === 'phone' ? page.getByTestId('bulk-item') : page.getByTestId('bulk-row');
}

function resultRows(page: Page, projectName: string) {
  return projectName === 'phone' ? page.getByTestId('bulk-result-item') : page.getByTestId('bulk-result');
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, BULK);
});

test.describe('bulk upload', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bulk Upload');
    await expect(page.getByText('Sample data').first()).toBeVisible();
  });

  test('offers the template as a download', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Download template' });
    await expect(link).toHaveAttribute('href', '/samples/bulk-shipments-template.csv');
    const response = await page.request.get('/samples/bulk-shipments-template.csv');
    expect(response.status()).toBe(200);
    expect((await response.text()).split(/\r?\n/)[0]).toBe(HEADER);
  });

  test('previews valid and invalid rows with each error', async ({ page }, testInfo) => {
    await page
      .getByLabel('Shipment file')
      .setInputFiles(file('shipments.csv', row(), row({ destination_pincode: '012345' })));
    await expect(previewRows(page, testInfo.project.name)).toHaveCount(2);
    await expect(page.getByText('Line 3: destination pincode is invalid').filter({ visible: true })).toBeVisible();
    await expect(page.getByText('1 valid, 1 invalid')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit 1 valid row' })).toBeEnabled();
  });

  test('rejects a file with wrong columns', async ({ page }) => {
    await page.getByLabel('Shipment file').setInputFiles({
      name: 'wrong.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('name,phone\r\nA,1\r\n'),
    });
    await expect(page.getByTestId('bulk-error')).toHaveText("The file's columns don't match the template.");
    await expect(page.getByRole('button', { name: /^Submit/ })).toHaveCount(0);
  });

  test('rejects more than 200 rows', async ({ page }) => {
    const many = Array.from({ length: 201 }, () => row());
    await page.getByLabel('Shipment file').setInputFiles(file('many.csv', ...many));
    await expect(page.getByTestId('bulk-error')).toHaveText('Upload at most 200 rows at a time.');
  });

  test('rejects a non-CSV file', async ({ page }) => {
    await page.getByLabel('Shipment file').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello'),
    });
    await expect(page.getByTestId('bulk-error')).toHaveText('Choose a .csv file.');
    await expect(page.getByRole('button', { name: /^Submit/ })).toHaveCount(0);
  });

  test('rejects a file over 1 MB', async ({ page }) => {
    await page.getByLabel('Shipment file').setInputFiles({
      name: 'big.csv',
      mimeType: 'text/csv',
      buffer: Buffer.alloc(1024 * 1024 + 1, 'a'),
    });
    await expect(page.getByTestId('bulk-error')).toHaveText('The file is larger than 1 MB.');
  });

  test('says when a file has no shipment rows', async ({ page }) => {
    await page.getByLabel('Shipment file').setInputFiles(file('empty.csv'));
    await expect(page.getByTestId('bulk-error')).toHaveText('The file has no shipment rows.');
  });

  test('submits valid rows and shows each result', async ({ page }, testInfo) => {
    const ref = `BULK-${randomUUID().slice(0, 8)}`;
    await page
      .getByLabel('Shipment file')
      .setInputFiles(
        file('shipments.csv', row({ reference_id: ref }), row({ destination_pincode: '012345' }), row()),
      );
    await page.getByRole('button', { name: 'Submit 2 valid rows' }).click();

    const results = resultRows(page, testInfo.project.name);
    await expect(results).toHaveCount(3);
    await expect(results.nth(0)).toContainText('Booked');
    await expect(results.nth(0)).toContainText(/AWB DEMO[A-Z0-9]+/);
    await expect(results.nth(1)).toContainText('Line 3: destination pincode is invalid');
    await expect(results.nth(1)).toContainText('Not booked');
    await expect(results.nth(2)).toContainText('Booked');
    await expect(page.getByText('2 booked, 1 not booked')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Submit/ })).toHaveCount(0);

    await page.goto(`/orders?search=${ref}`);
    await expect(page.getByText(ref).filter({ visible: true }).first()).toBeVisible();
  });

  test('lets the merchant start over after a result', async ({ page }) => {
    await page.getByLabel('Shipment file').setInputFiles(file('shipments.csv', row()));
    await page.getByRole('button', { name: 'Submit 1 valid row' }).click();
    await expect(page.getByText('1 booked')).toBeVisible();
    await page.getByRole('button', { name: 'Upload another file' }).click();
    await expect(page.getByLabel('Shipment file')).toBeVisible();
    await expect(page.getByText('1 booked')).toHaveCount(0);
  });

  test('previews a valid file of exactly 1 MB', async ({ page }, testInfo) => {
    // The largest allowed file: 2 shipment rows plus blank lines, which are skipped. With the default
    // 1 MB server action limit the request is rejected, because it is a little larger than the file.
    const rows = [HEADER, row(), row()].join('\n') + '\n';
    const buffer = Buffer.from(rows + '\n'.repeat(1024 * 1024 - rows.length));
    expect(buffer.length).toBe(1024 * 1024);
    await page.getByLabel('Shipment file').setInputFiles({ name: 'large.csv', mimeType: 'text/csv', buffer });
    await expect(page.getByText('2 valid, 0 invalid')).toBeVisible();
    await expect(previewRows(page, testInfo.project.name)).toHaveCount(2);
    await expect(page.getByTestId('bulk-error')).toHaveCount(0);
  });

  test('sending the same file twice books each shipment once', async ({ page }, testInfo) => {
    const refs = [`BULK-${randomUUID().slice(0, 8)}`, `BULK-${randomUUID().slice(0, 8)}`];
    const upload = file('twice.csv', ...refs.map((reference_id) => row({ reference_id })));
    const results = resultRows(page, testInfo.project.name);
    const awbs: string[][] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.getByLabel('Shipment file').setInputFiles(upload);
      await page.getByRole('button', { name: 'Submit 2 valid rows' }).click();
      await expect(page.getByText('2 booked, 0 not booked')).toBeVisible();
      awbs.push(await results.allTextContents());
      await page.getByRole('button', { name: 'Upload another file' }).click();
    }
    expect(awbs[1]).toEqual(awbs[0]);
    for (const ref of refs) {
      await page.goto(`/orders?search=${ref}`);
      const list = testInfo.project.name === 'phone' ? page.getByTestId('order-card') : page.getByTestId('order-row');
      await expect(list).toHaveCount(1);
    }
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await page.getByLabel('Shipment file').setInputFiles(file('a.csv', row(), row({ origin_pincode: 'x' })));
    await expect(page.getByText('1 valid, 1 invalid')).toBeVisible();
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('wraps long values', async ({ page }) => {
    const long = 'Bharatiya-Rashtriya-Audyogik-Vikas-Nigam-Limited-'.repeat(2);
    await page.getByLabel('Shipment file').setInputFiles(
      file(
        'long.csv',
        row({
          destination_name: long,
          destination_city: 'Thiruvananthapuram'.repeat(4),
          reference_id: 'R'.repeat(60),
        }),
        row({ destination_pincode: '9'.repeat(40) }),
      ),
    );
    await expect(page.getByText('1 valid, 1 invalid')).toBeVisible();
    await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
    await page.getByRole('button', { name: 'Submit 1 valid row' }).click();
    await expect(page.getByText('1 booked, 1 not booked')).toBeVisible();
    await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);

    // The booked shipment, with its 60-character reference, must also fit on All Shipments.
    await page.goto(`/orders?search=${'R'.repeat(60)}`);
    await expect(page.getByText('R'.repeat(60)).filter({ visible: true }).first()).toBeVisible();
    await expectNoSidewaysScroll(page, [
      { width: 320, height: 568 },
      { width: 1024, height: 768 },
    ]);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone check');
    await expectTapTargets(page, [
      page.getByRole('link', { name: 'Download template' }),
      page.getByLabel('Shipment file'),
    ]);
    await page.getByLabel('Shipment file').setInputFiles(file('a.csv', row()));
    const submit = page.getByRole('button', { name: 'Submit 1 valid row' });
    await expectTapTargets(page, [submit]);
    await submit.click();
    await expectTapTargets(page, [page.getByRole('button', { name: 'Upload another file' })]);
  });
});
