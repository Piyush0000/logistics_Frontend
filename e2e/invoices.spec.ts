import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const INVOICES = '/finances/invoices';
const LONG_NUMBER = 'DEMO-INV-2026-27-OCT-000000012345';

function rows(page: Page, projectName: string) {
  return projectName === 'phone' ? page.getByTestId('invoice-item') : page.getByTestId('invoice-row');
}

async function open(page: Page, route = INVOICES) {
  await signIn(page);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: 'Invoices' })).toBeVisible();
}

const yearPicker = (page: Page) => page.getByRole('button', { name: /^Year/ });

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, INVOICES);
  await expectSignedOutRedirect(page, `${INVOICES}/inv-2026-10`);
});

test('shows the page title and sample label', async ({ page }) => {
  await open(page);

  await expect(page.getByTestId('invoices-card').getByText('Sample data')).toBeVisible();
});

test('does not scroll sideways at any size', async ({ page }) => {
  await open(page);
  await expectNoSidewaysScroll(page, SIZES);
});

test('wraps long values', async ({ page }) => {
  await open(page);
  // The newest sample invoice has a long number and a total above one crore rupees.
  await expect(page.getByText(LONG_NUMBER).locator('visible=true').first()).toBeVisible();
  await expect(page.getByText('₹10,66,31,297.08').locator('visible=true').first()).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  // An amount stays on one line, never split in the middle of its digits.
  await page.setViewportSize({ width: 320, height: 568 });
  const total = page.getByText('₹10,66,31,297.08').locator('visible=true').first();
  expect((await total.boundingBox())?.height ?? 99).toBeLessThan(30);

  await page.goto(`${INVOICES}/inv-2026-10`);
  await expect(page.getByText(LONG_NUMBER).first()).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await open(page);

  await expectTapTargets(page, [
    yearPicker(page),
    page.getByRole('button', { name: 'Apply' }),
    page.getByRole('link', { name: 'Clear' }),
    page.getByRole('link', { name: 'View' }).first(),
    page.getByRole('link', { name: 'Next page' }),
  ]);
});

test.describe('invoice list', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the first page, newest first', async ({ page }, testInfo) => {
    const list = rows(page, testInfo.project.name);

    await expect(list).toHaveCount(10);
    await expect(list.first()).toContainText(LONG_NUMBER);
    await expect(list.first()).toContainText('Due');
    await expect(list.nth(2)).toContainText('DEMO-INV-2026-08');
    await expect(list.nth(2)).toContainText('Paid');
  });

  test('shows the columns on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop table only');
    const table = page.getByRole('table', { name: 'Invoices' });

    for (const heading of ['Invoice number', 'Period', 'Shipments', 'Taxable', 'GST', 'Total', 'Status', 'View']) {
      await expect(table.getByRole('columnheader', { name: heading })).toBeVisible();
    }
  });

  test('shows the period and amounts for an invoice', async ({ page }, testInfo) => {
    const row = rows(page, testInfo.project.name).nth(2);

    await expect(row).toContainText('1 Aug 2026');
    await expect(row).toContainText('31 Aug 2026');
    await expect(row).toContainText('₹');
  });

  test('moves between pages', async ({ page }) => {
    await page.getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);

    await page.getByRole('link', { name: 'Previous page' }).click();
    await expect(page).toHaveURL(new RegExp(`${INVOICES}$`));
  });

  test('filters by year', async ({ page }, testInfo) => {
    await yearPicker(page).click();
    await expect(page.getByRole('option')).toHaveText(['All years', '2026', '2025', '2024']);
    await page.getByRole('option', { name: '2025' }).click();
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page).toHaveURL(/year=2025/);
    await expect(rows(page, testInfo.project.name)).toHaveCount(10);
    await expect(rows(page, testInfo.project.name).first()).toContainText('DEMO-INV-2025-12');
    await expect(page.getByText('DEMO-INV-2026')).toHaveCount(0);

    // The year stays when moving to page 2, which holds the first two months.
    await page.getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/year=2025&page=2/);
    await expect(rows(page, testInfo.project.name)).toHaveCount(2);
  });

  test('clears the year', async ({ page }) => {
    await page.goto(`${INVOICES}?year=2025`);
    await page.getByRole('link', { name: 'Clear' }).click();

    await expect(page).toHaveURL(new RegExp(`${INVOICES}$`));
  });
});

test('shows an empty state', async ({ page }) => {
  await open(page, `${INVOICES}?year=2024`);

  await expect(page.getByText('No invoices for this year.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Next page' })).toHaveCount(0);
});

test('ignores bad URL input', async ({ page }, testInfo) => {
  const long = 'x'.repeat(300);
  await signIn(page);
  for (const query of ['page=abc', 'page=-1', 'year=FOO', 'year=-5', 'year=1e3', 'year=2025.5', `year=${long}`, `q=${long}`]) {
    await page.goto(`${INVOICES}?${query}`);
    await expect(rows(page, testInfo.project.name)).toHaveCount(10);
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  }
});

test.describe('print view', () => {
  test('opens the print view with the sample banner', async ({ page }) => {
    await open(page);
    await page.getByRole('link', { name: 'View' }).locator('visible=true').first().click();

    await expect(page).toHaveURL(`${INVOICES}/inv-2026-10`);
    await expect(page.getByRole('heading', { level: 1, name: 'Invoice' })).toBeVisible();
    await expect(page.getByText('Sample invoice. Not a tax document.')).toBeVisible();
    await expect(page.getByText(LONG_NUMBER).first()).toBeVisible();
    for (const label of ['Freight', 'COD fees', 'Taxable value', 'GST at 18%', 'Total']) {
      await expect(page.getByRole('rowheader', { name: new RegExp(`^${label}`) })).toBeVisible();
    }
    // The line items add up on the page: 18% of the taxable value, and the total is both.
    await expect(page.getByRole('row', { name: /Taxable value/ })).toContainText('₹9,03,65,506.00');
    await expect(page.getByRole('row', { name: /GST at 18%/ })).toContainText('₹1,62,65,791.08');
    await expect(page.getByRole('button', { name: 'Print invoice' })).toBeVisible();
  });

  test('hides its controls but keeps the sample banner when printed', async ({ page }) => {
    await open(page);
    await page.goto(`${INVOICES}/inv-2026-09`);
    await page.emulateMedia({ media: 'print' });

    await expect(page.getByRole('button', { name: 'Print invoice' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Back to invoices' })).toBeHidden();
    await expect(page.getByText('Sample invoice. Not a tax document.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Invoice' })).toBeVisible();
  });

  test('prints from the Print button', async ({ page }) => {
    await open(page);
    await page.goto(`${INVOICES}/inv-2026-09`);
    await page.evaluate(() => {
      const w = window as unknown as { printed: number };
      w.printed = 0;
      window.print = () => {
        w.printed += 1;
      };
    });
    await page.getByRole('button', { name: 'Print invoice' }).click();

    expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);
  });

  test('returns not found for an unknown invoice id', async ({ page }) => {
    await open(page);
    await page.goto(`${INVOICES}/no-such-invoice`);

    await expect(page.getByText('Invoice not found.')).toBeVisible();
    await expect(page.getByText('Sample invoice. Not a tax document.')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Back to invoices' })).toBeVisible();
  });
});
