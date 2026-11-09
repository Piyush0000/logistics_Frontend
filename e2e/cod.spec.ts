import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { signIn } from './helpers';

const COD = '/finances/cod';
const DATE_ERROR = 'From Date must be on or before To Date.';

const rows = (page: Page) => page.getByTestId('remittance-row').locator('visible=true');
const picker = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(name) });
const apply = (page: Page) => page.getByRole('button', { name: 'Apply' });

async function open(page: Page, path = COD) {
  await signIn(page);
  await page.goto(path, { waitUntil: 'networkidle' });
}

test('sends signed-out visitors to login', async ({ page }) => {
  await page.goto(COD);

  await expect(page).toHaveURL(/\/login/);
});

test('refuses the export when signed out', async ({ request }) => {
  const response = await request.get(`${COD}/export`);

  expect(response.status()).toBe(401);
  expect(await response.text()).not.toContain('DEMO-COD');
});

test.describe('cod remittance', () => {
  test('shows the heading, summary and first page, labelled as sample data', async ({ page }) => {
    await open(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('COD Remittance');
    await expect(page.getByText('Track your Cash on Delivery settlements')).toBeVisible();

    const summary = page.getByTestId('cod-summary');
    for (const label of [
      'Remitted Till Date',
      'Last Remittance',
      'Next Remittance (Expected)',
      'Total Remittance Due',
    ]) {
      await expect(summary.getByText(label)).toBeVisible();
    }
    await expect(summary.getByText('Sample data')).toBeVisible();
    await expect(page.getByTestId('cod-remittances').getByText('Sample data')).toBeVisible();
    await expect(rows(page)).toHaveCount(20);
  });

  test('shows a pending order', async ({ page }) => {
    await open(page);
    const row = rows(page).first();

    await expect(row).toContainText('DEMO-COD-3000');
    await expect(row).toContainText('AWB: DEMOAWB480000');
    await expect(row).toContainText('Delhivery');
    await expect(row).toContainText('₹1,050');
    await expect(row).toContainText('Pending');
    await expect(row).toContainText('30 Oct 2026');
  });

  test('shows a settled order with its deduction and date', async ({ page }) => {
    await open(page, `${COD}?status=settled`);
    const row = rows(page).filter({ hasText: 'DEMO-COD-2986' });

    await expect(row).toContainText('-₹30');
    await expect(row).toContainText('Settled');
  });
});

test.describe('filters', () => {
  test('filters by status', async ({ page }) => {
    await open(page);

    await picker(page, 'Status').click();
    await expect(page.getByRole('option')).toHaveText(['All', 'Pending', 'Settled']);
    await page.getByRole('option', { name: 'Pending' }).click();
    await apply(page).click();

    await expect(page).toHaveURL(/status=pending/);
    await expect(rows(page)).toHaveCount(14);
  });

  test('leaves the summary alone when filtering', async ({ page }) => {
    await open(page);
    const before = await page.getByTestId('cod-summary').textContent();

    await page.goto(`${COD}?status=pending`, { waitUntil: 'networkidle' });

    await expect(page.getByTestId('cod-summary')).toHaveText(before ?? '');
  });

  test('filters by date', async ({ page }) => {
    await open(page, `${COD}?from=2026-10-01`);

    await picker(page, 'From Date').click();
    await page
      .getByRole('dialog', { name: 'From Date calendar' })
      .getByRole('button', { name: '25/10/2026' })
      .click();
    await apply(page).click();

    await expect(page).toHaveURL(/from=2026-10-25/);
    await expect(rows(page)).toHaveCount(6);
  });

  test('stops a date range that runs backwards', async ({ page }) => {
    await open(page, `${COD}?from=2026-10-20&to=2026-10-25`);

    await picker(page, 'To Date').click();
    await page.getByRole('button', { name: '15/10/2026' }).click();
    await apply(page).click();

    await expect(page.getByTestId('filter-error')).toHaveText(DATE_ERROR);
    await expect(page).toHaveURL(/to=2026-10-25/);
  });

  test('explains a backwards range typed into the URL', async ({ page }) => {
    await open(page, `${COD}?from=2026-10-20&to=2026-10-01`);

    await expect(page.getByTestId('filter-error')).toHaveText(DATE_ERROR);
    await expect(rows(page)).toHaveCount(0);
  });

  test('clears every filter', async ({ page }) => {
    await open(page, `${COD}?status=settled&from=2026-10-01`);

    await page.getByRole('link', { name: 'Clear' }).click();

    await expect(page).toHaveURL(new RegExp(`${COD}$`));
    await expect(picker(page, 'Status')).toContainText('All');
    await expect(picker(page, 'From Date')).toContainText('Select date');
  });

  test('explains when nothing matches, and offers no export', async ({ page }) => {
    await open(page, `${COD}?from=2020-01-01&to=2020-01-31`);

    await expect(page.getByText('No remittances match these filters.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Export CSV' })).toHaveCount(0);
    await expect(page.getByText('Export CSV')).toHaveAttribute('aria-disabled', 'true');
  });

  test('ignores nonsense in the URL', async ({ page }) => {
    await open(page, `${COD}?status=x&from=z&to=1&page=-4&perPage=3`);

    await expect(rows(page)).toHaveCount(20);
  });
});

test.describe('pages', () => {
  test('moves forward and back', async ({ page }) => {
    await open(page);
    const pages = page.getByTestId('cod-pagination');

    await expect(pages).toContainText('1-20 of 46');
    await expect(page.getByRole('link', { name: 'Previous page' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pages).toContainText('21-40 of 46');
    await expect(rows(page).first()).toContainText('DEMO-COD-2980');

    await page.getByRole('link', { name: 'Previous page' }).click();
    await expect(pages).toContainText('1-20 of 46');
  });

  test('changes rows per page, going back to the first page', async ({ page }) => {
    await open(page, `${COD}?page=2`);

    await picker(page, 'Rows per page').click();
    await page.getByRole('option', { name: '10', exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`${COD}\\?perPage=10$`));
    await expect(rows(page)).toHaveCount(10);
    await expect(page.getByTestId('cod-pagination')).toContainText('1-10 of 46');
  });

  test('turns Next off on the last page', async ({ page }) => {
    await open(page, `${COD}?page=3`);

    await expect(rows(page)).toHaveCount(6);
    await expect(page.getByRole('link', { name: 'Next page' })).toHaveCount(0);
  });
});

test.describe('export', () => {
  test('downloads the filtered rows as a labelled CSV', async ({ page }) => {
    await open(page, `${COD}?status=pending&perPage=10`);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Export CSV' }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('cod-remittance-sample.csv');
    const lines = (await readFile(await download.path(), 'utf8')).trim().split('\r\n');
    expect(lines[0]).toBe('Sample data: these are not real remittances');
    expect(lines[1]).toContain('Order Number,AWB,Courier');
    // Every pending row, not only the ten on screen, plus the notice and the header.
    expect(lines).toHaveLength(16);
    expect(lines.slice(2).every((line) => line.includes(',Pending,'))).toBe(true);
  });
});

test.describe('layout', () => {
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [390, 844],
    [844, 390],
    [768, 1024],
    [1024, 768],
    [1280, 800],
    [1366, 768],
    [1920, 1080],
  ] as const) {
    test(`does not scroll sideways at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
    });
  }

  test('uses a table on desktop and cards on phones', async ({ page }, testInfo) => {
    await open(page);
    const table = page.getByRole('table', { name: 'COD remittances' });

    if (testInfo.project.name === 'phone') await expect(table).toBeHidden();
    else await expect(table).toBeVisible();
  });

  test('keeps every tap target at least 44px tall on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await open(page);

    for (const target of [
      page.getByRole('link', { name: 'Export CSV' }),
      picker(page, 'Status'),
      picker(page, 'From Date'),
      picker(page, 'To Date'),
      apply(page),
      page.getByRole('link', { name: 'Clear' }),
      picker(page, 'Rows per page'),
      page.getByRole('link', { name: 'Next page' }),
    ]) {
      expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
