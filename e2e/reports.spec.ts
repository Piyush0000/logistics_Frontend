import { expect, test } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const REPORTS = '/reports';
const RANGE = 'from=2026-10-01&to=2026-10-31';

const CARD_TITLES = ['Shipments', 'NDR', 'RTO', 'COD remittance', 'Wallet transactions'];

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, REPORTS);
});

test('returns 401 when signed out', async ({ page }) => {
  const response = await page.request.get(`/reports/export?type=shipments&${RANGE}`);

  expect(response.status()).toBe(401);
  expect(response.headers()['content-type']).not.toContain('text/csv');
});

test.describe('reports', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto(REPORTS);
    await expect(page.getByRole('heading', { level: 1, name: 'Reports' })).toBeVisible();
  });

  test('shows the page title', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reports');
  });

  test('shows five report cards, each with a description and Download', async ({ page }) => {
    for (const title of CARD_TITLES) {
      const card = page.getByRole('region', { name: title, exact: true });
      await expect(card).toBeVisible();
      await expect(card.getByRole('link', { name: /^Download/ })).toBeVisible();
    }
    await expect(page.getByTestId('report-card')).toHaveCount(5);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone only');
    const downloads = page.getByRole('link', { name: /^Download/ });
    await expectTapTargets(page, [
      page.getByRole('button', { name: /From date/ }),
      page.getByRole('button', { name: /To date/ }),
      ...(await downloads.all()),
    ]);
  });

  test('defaults the range to the last 30 days', async ({ page }) => {
    const href = await page.getByRole('link', { name: /^Download/ }).first().getAttribute('href');
    const params = new URL(href ?? '', 'http://x').searchParams;
    const days = (Date.parse(params.get('to') ?? '') - Date.parse(params.get('from') ?? '')) / 86_400_000;

    expect(days).toBe(29);
  });

  test('downloads a shipments CSV with the right columns and filename', async ({ page }) => {
    await page.goto(`${REPORTS}?${RANGE}`);
    const card = page.getByRole('region', { name: 'Shipments', exact: true });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      card.getByRole('link', { name: /^Download/ }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('shipments-2026-10-01-to-2026-10-31.csv');

    const response = await page.request.get(`/reports/export?type=shipments&${RANGE}`);
    expect(response.headers()['content-type']).toBe('text/csv; charset=utf-8');
    expect(response.headers()['content-disposition']).toBe(
      'attachment; filename="shipments-2026-10-01-to-2026-10-31.csv"',
    );
    const lines = (await response.text()).split('\r\n');
    expect(lines[1]).toBe('Reference,AWB,Courier,Status,Created,Last Update');
    expect(lines.some((line) => line.includes('DEMOEK001'))).toBe(true);
  });

  test('marks sample reports with a first line', async ({ page }) => {
    for (const type of ['shipments', 'ndr', 'rto', 'cod', 'wallet']) {
      const response = await page.request.get(`/reports/export?type=${type}&${RANGE}`);

      expect(response.status(), type).toBe(200);
      expect((await response.text()).split('\r\n')[0], type).toBe('# Sample data');
    }
  });

  test('writes wallet debits as plain negative numbers', async ({ page }) => {
    const response = await page.request.get('/reports/export?type=wallet&from=2026-10-01&to=2026-10-31');
    const rows = (await response.text()).split('\r\n').slice(2).filter(Boolean);
    const debits = rows.filter((row) => row.includes(',Debit,'));

    expect(debits.length).toBeGreaterThan(0);
    for (const row of debits) {
      expect(row).toMatch(/,-\d+\.\d{2}$/);
      expect(row).not.toContain("'-");
    }
  });

  test('keeps only rows inside the date range', async ({ page }) => {
    const response = await page.request.get(
      '/reports/export?type=shipments&from=2026-10-23&to=2026-10-23',
    );
    const rows = (await response.text()).split('\r\n').slice(2).filter(Boolean);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toContain('23 Oct 2026');
  });

  test('returns 400 with a message for a bad request', async ({ page }) => {
    for (const query of [
      'type=shipments&from=2026-01-01&to=2026-04-03',
      'type=shipments&from=2026-10-10&to=2026-10-01',
      `type=everything&${RANGE}`,
      'type=shipments&from=abc&to=2026-10-01',
      'type=shipments',
    ]) {
      const response = await page.request.get(`/reports/export?${query}`);

      expect(response.status(), query).toBe(400);
      expect((await response.text()).length).toBeGreaterThan(0);
    }
  });

  test('shows an error and removes Download when to is before from', async ({ page }) => {
    await page.goto(`${REPORTS}?from=2026-10-10&to=2026-10-01`);

    await expect(page.getByTestId('report-error')).toContainText('To date must be on or after From date.');
    await expect(page.getByRole('link', { name: /^Download/ })).toHaveCount(0);
  });

  test('ignores bad URL input', async ({ page }) => {
    await page.goto(`${REPORTS}?from=abc&to=${'9'.repeat(300)}&type=FOO&page=-1`);

    await expect(page.getByRole('heading', { level: 1, name: 'Reports' })).toBeVisible();
    await expect(page.getByTestId('report-error')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Download/ })).toHaveCount(5);
  });
});
