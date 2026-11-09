import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

const WALLET = '/finances/wallet';

const rows = (page: Page) => page.getByTestId('transaction-row');
const picker = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(name) });
const apply = (page: Page) => page.getByRole('button', { name: 'Apply' });

async function open(page: Page, path = WALLET) {
  await signIn(page);
  await page.goto(path, { waitUntil: 'networkidle' });
}

test('sends signed-out visitors to login', async ({ page }) => {
  await page.goto(WALLET);

  await expect(page).toHaveURL(/\/login/);
});

test.describe('wallet transactions', () => {
  test('shows the balance and first page, labelled as sample data', async ({ page }) => {
    await open(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wallet Transactions');
    const balance = page.getByTestId('wallet-balance');
    await expect(balance).toContainText('₹12,500.00');
    await expect(balance.getByText('Sample data')).toBeVisible();
    await expect(page.getByTestId('wallet-transactions').getByText('Sample data')).toBeVisible();
    await expect(rows(page)).toHaveCount(10);
  });

  test('shows a debit with its order, breakdown and date', async ({ page }) => {
    await open(page);
    const row = rows(page).first();

    await expect(row).toContainText('RTO freight - Delhivery (DEMO-ORD-2000)');
    await expect(row).toContainText('Order: DEMO-ORD-2000');
    await expect(row).toContainText('Breakdown: Freight ₹64.00 | Other ₹14.00 | COD ₹0.00');
    await expect(row).toContainText('-₹78.00');
    await expect(row).toContainText('30/10/2026, 12:01:00 am');
  });

  test('shows a credit with a plus sign and no breakdown', async ({ page }) => {
    await open(page, `${WALLET}?type=credit`);
    const row = rows(page).filter({ hasText: 'Wallet recharge' }).first();

    await expect(row).toContainText('+₹5,000.00');
    await expect(row).not.toContainText('Breakdown');
  });
});

test.describe('filters', () => {
  test('filters by transaction type', async ({ page }) => {
    await open(page);

    await picker(page, 'Transaction Type').click();
    await page.getByRole('option', { name: 'Credit' }).click();
    await apply(page).click();

    await expect(page).toHaveURL(/type=credit/);
    await expect(rows(page)).toHaveCount(4);
  });

  test('offers every debit type', async ({ page }) => {
    await open(page);

    await picker(page, 'Debit Type').click();

    await expect(page.getByRole('option')).toHaveText([
      'All Debit Types',
      'B2C Prepaid Charges',
      'B2C COD Charges',
      'RTO Freight',
      'Reverse Shipment',
      'Invoice Payment',
      'Invoice Credits/Waivers',
      'Weight Discrepancy',
      'Dispute Rejected',
    ]);
  });

  test('filters by debit type', async ({ page }) => {
    await open(page);

    await picker(page, 'Debit Type').click();
    await page.getByRole('option', { name: 'Weight Discrepancy' }).click();
    await apply(page).click();

    await expect(page).toHaveURL(/debitType=weight-discrepancy/);
    await expect(rows(page)).toHaveCount(2);
  });

  test('turns the debit type off for credits and clears its choice', async ({ page }) => {
    await open(page, `${WALLET}?debitType=invoice-payment`);

    await picker(page, 'Transaction Type').click();
    await page.getByRole('option', { name: 'Credit' }).click();

    await expect(picker(page, 'Debit Type')).toBeDisabled();
    await expect(picker(page, 'Debit Type')).toContainText('All Debit Types');
  });

  test('works from the keyboard', async ({ page }) => {
    await open(page);

    await picker(page, 'Transaction Type').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(picker(page, 'Transaction Type')).toContainText('Debit');
    await expect(picker(page, 'Transaction Type')).toBeFocused();
  });

  test('closes a list on Escape and returns focus', async ({ page }) => {
    await open(page);

    await picker(page, 'Transaction Type').click();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(picker(page, 'Transaction Type')).toBeFocused();
  });

  test('picks dates from the calendar', async ({ page }) => {
    await open(page, `${WALLET}?from=2026-10-01`);

    await picker(page, 'From Date').click();
    const calendar = page.getByRole('dialog', { name: 'From Date calendar' });
    await expect(calendar).toContainText('October 2026');
    await calendar.getByRole('button', { name: '25/10/2026' }).click();

    await expect(calendar).toBeHidden();
    await expect(picker(page, 'From Date')).toContainText('25/10/2026');
    await apply(page).click();
    await expect(page).toHaveURL(/from=2026-10-25/);
    await expect(rows(page)).toHaveCount(6);
  });

  test('moves between months and uses arrow keys', async ({ page }) => {
    await open(page, `${WALLET}?to=2026-10-15`);

    await picker(page, 'To Date').click();
    const calendar = page.getByRole('dialog', { name: 'To Date calendar' });
    await calendar.getByRole('button', { name: 'Previous month' }).click();
    await expect(calendar).toContainText('September 2026');
    await calendar.getByRole('button', { name: 'Next month' }).click();
    await calendar.getByRole('button', { name: '15/10/2026' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(picker(page, 'To Date')).toContainText('23/10/2026');
  });

  test('removes a chosen date', async ({ page }) => {
    await open(page, `${WALLET}?from=2026-10-01`);

    await picker(page, 'From Date').click();
    await page.getByRole('button', { name: 'Remove date' }).click();

    await expect(picker(page, 'From Date')).toContainText('Select date');
  });

  test('stops a date range that runs backwards', async ({ page }) => {
    await open(page, `${WALLET}?from=2026-10-20&to=2026-10-25`);

    await picker(page, 'To Date').click();
    await page.getByRole('button', { name: '15/10/2026' }).click();
    await apply(page).click();

    await expect(page.getByTestId('filter-error')).toHaveText(
      'From Date must be on or before To Date.',
    );
    await expect(page).toHaveURL(/to=2026-10-25/);
  });

  test('explains a backwards range typed into the URL', async ({ page }) => {
    await open(page, `${WALLET}?from=2026-10-20&to=2026-10-01`);

    await expect(page.getByTestId('filter-error')).toHaveText(
      'From Date must be on or before To Date.',
    );
    await expect(rows(page)).toHaveCount(0);
  });

  test('clears every filter', async ({ page }) => {
    await open(page, `${WALLET}?type=debit&debitType=b2c-cod&from=2026-10-01&page=1`);

    await page.getByRole('link', { name: 'Clear' }).click();

    await expect(page).toHaveURL(new RegExp(`${WALLET}$`));
    await expect(picker(page, 'Transaction Type')).toContainText('All');
    await expect(picker(page, 'Debit Type')).toContainText('All Debit Types');
    await expect(picker(page, 'From Date')).toContainText('Select date');
    await expect(rows(page)).toHaveCount(10);
  });

  test('explains when nothing matches', async ({ page }) => {
    await open(page, `${WALLET}?from=2020-01-01&to=2020-01-31`);

    await expect(page.getByText('No transactions match these filters.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Next' })).toHaveCount(0);
  });

  test('ignores nonsense in the URL', async ({ page }) => {
    await open(page, `${WALLET}?type=x&debitType=y&from=z&to=1&page=-4`);

    await expect(rows(page)).toHaveCount(10);
  });
});

test.describe('pages', () => {
  test('moves forward and back, with Previous off on the first page', async ({ page }) => {
    await open(page);

    await expect(page.getByTestId('pagination')).toContainText('Page 1 of 3');
    await expect(page.getByRole('link', { name: 'Previous' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Next' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page).first()).toContainText('DEMO-ORD-1990');

    await page.getByRole('link', { name: 'Previous' }).click();
    await expect(rows(page).first()).toContainText('DEMO-ORD-2000');
  });

  test('keeps filters when changing page', async ({ page }) => {
    await open(page, `${WALLET}?type=debit`);

    await page.getByRole('link', { name: 'Next' }).click();

    await expect(page).toHaveURL(/type=debit&page=2/);
    await expect(picker(page, 'Transaction Type')).toContainText('Debit');
  });

  test('turns Next off on the last page', async ({ page }) => {
    await open(page, `${WALLET}?page=3`);

    await expect(rows(page)).toHaveCount(4);
    await expect(page.getByRole('link', { name: 'Next' })).toHaveCount(0);
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
    [1366, 768],
    [1920, 1080],
  ] as const) {
    test(`does not scroll sideways at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page);

      const overflow = async () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );

      expect(await overflow()).toBeLessThanOrEqual(0);
      await picker(page, 'From Date').click();
      expect(await overflow()).toBeLessThanOrEqual(0);
    });
  }

  test('keeps every tap target at least 44px tall on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await open(page);

    for (const target of [
      picker(page, 'Transaction Type'),
      picker(page, 'Debit Type'),
      picker(page, 'From Date'),
      picker(page, 'To Date'),
      apply(page),
      page.getByRole('link', { name: 'Clear' }),
      page.getByRole('link', { name: 'Next' }),
    ]) {
      expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }

    await picker(page, 'From Date').click();
    const calendar = page.getByRole('dialog', { name: 'From Date calendar' });
    for (const name of ['Previous month', 'Next month']) {
      expect(
        (await calendar.getByRole('button', { name }).boundingBox())?.height,
      ).toBeGreaterThanOrEqual(44);
    }
    const day = calendar.locator('[data-day]').first();
    expect((await day.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    await page.keyboard.press('Escape');
    await picker(page, 'Transaction Type').click();
    expect(
      (await page.getByRole('option', { name: 'Credit' }).boundingBox())?.height,
    ).toBeGreaterThanOrEqual(44);
  });
});
