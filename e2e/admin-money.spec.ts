import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { signInAdmin } from './admin-helpers';

const MONEY = '/admin/money';
const ledger = (merchantId: string) => `${MONEY}/wallets/${merchantId}`;

/** "₹11,800.00" or "-₹1,200.00" as paise. */
function paise(text: string): number {
  const digits = Number(text.replace(/[^\d]/g, ''));
  return /[-−]/.test(text) ? -digits : digits;
}

const rupees = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(value / 100);

// Tests that save run once per project against one shared server, so each project adjusts its own merchant.
const OWN_MERCHANT: Record<string, { id: string; name: string }> = {
  desktop: { id: 'mer_005', name: 'Pixel Gadgets' },
  phone: { id: 'mer_003', name: 'UrbanThread Apparel' },
};
const ownMerchant = (testInfo: TestInfo) => OWN_MERCHANT[testInfo.project.name] ?? OWN_MERCHANT.desktop!;

async function open(page: Page, path = MONEY) {
  await signInAdmin(page);
  await page.goto(path, { waitUntil: 'networkidle' });
}

const popup = (page: Page) => page.getByRole('dialog', { name: 'Adjust wallet' });

async function openAdjust(page: Page, merchantName: string) {
  await page.getByRole('button', { name: `Adjust wallet of ${merchantName}` }).click();
  await expect(popup(page)).toBeVisible();
}

async function fill(page: Page, { amount, reason, direction }: { amount: string; reason: string; direction?: 'Credit' | 'Debit' }) {
  if (direction) await popup(page).getByText(new RegExp(`^${direction}`)).click();
  await popup(page).getByLabel('Amount (₹)').fill(amount);
  await popup(page).getByLabel('Reason').fill(reason);
  await popup(page).getByRole('button', { name: 'Review' }).click();
}

test('sends a signed-out visitor to the admin sign-in', async ({ page }) => {
  await page.goto(ledger('mer_001'));

  await expect(page).toHaveURL(/\/admin\/login$/);
});

test.describe('money', () => {
  test('shows the summary figures and every wallet, labelled sample', async ({ page }, testInfo) => {
    await open(page);

    await expect(page.getByTestId('money-float')).toContainText('₹');
    await expect(page.getByTestId('money-negative')).toContainText(/\d/);
    await expect(page.getByTestId('money-cod-outstanding')).toContainText('₹');
    await expect(page.getByTestId('money-short')).toContainText('Short payments');
    await expect(page.getByTestId('admin-wallets').getByText('Sample data')).toBeVisible();

    const rowKind = testInfo.project.name === 'phone' ? 'admin-wallet-card' : 'admin-wallet-row';
    await expect(page.getByTestId(rowKind)).toHaveCount(8);
  });

  test('credits a wallet after a confirm step, then shows it in the ledger and the audit log', async ({ page }, testInfo) => {
    // A long flow (sign in, two submits, the audit log); under a full parallel run it needs more than 30s.
    test.slow();
    const merchant = ownMerchant(testInfo);
    const reason = `E2E goodwill credit ${testInfo.project.name} ${Date.now()}`;
    await open(page, ledger(merchant.id));
    await expect(page.getByRole('heading', { level: 1, name: merchant.name })).toBeVisible();
    const before = paise(await page.getByTestId('ledger-balance').innerText());

    await openAdjust(page, merchant.name);
    await fill(page, { amount: '1,234.56', reason, direction: 'Credit' });

    const review = popup(page).getByTestId('adjust-review');
    await expect(review).toContainText(rupees(before));
    await expect(review).toContainText(`+${rupees(123_456)}`);
    await expect(popup(page).getByTestId('adjust-new-balance')).toHaveText(rupees(before + 123_456));

    await popup(page).getByRole('button', { name: 'Confirm credit' }).click();
    await expect(popup(page).getByTestId('adjust-saved')).toContainText(`New balance ${rupees(before + 123_456)}`);
    await popup(page).getByRole('button', { name: 'Done' }).click();
    await expect(popup(page)).toHaveCount(0);

    await expect(page.getByTestId('ledger-balance')).toContainText(rupees(before + 123_456).replace(/\.\d+$/, ''));
    const line = page.getByTestId(testInfo.project.name === 'phone' ? 'admin-ledger-card' : 'admin-ledger-row').first();
    await expect(line).toContainText(reason);
    await expect(line).toContainText('Admin adjustment');
    await expect(line).toContainText(`+${rupees(123_456)}`);

    await page.goto('/admin/system?action=Wallet+credit', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('admin-audit-entry').filter({ hasText: reason })).toContainText(
      `${merchant.id} · ${merchant.name}`,
    );
  });

  test('rejects bad amounts and short reasons, and keeps what was typed', async ({ page }) => {
    await open(page);
    await openAdjust(page, 'Neelgiri Teas');

    await fill(page, { amount: '1.234', reason: 'abc' });
    await expect(popup(page).getByText('Enter an amount from ₹0.01 to ₹5,00,000.')).toBeVisible();
    await expect(popup(page).getByText('Give a reason of 5 to 300 characters.')).toBeVisible();
    await expect(popup(page).getByTestId('adjust-review')).toHaveCount(0);

    for (const amount of ['0', '-50', '500000.01']) {
      await fill(page, { amount, reason: 'Goodwill credit' });
      await expect(popup(page).getByText('Enter an amount from ₹0.01 to ₹5,00,000.'), amount).toBeVisible();
    }
    await fill(page, { amount: 'ten', reason: 'Goodwill credit' });
    await expect(popup(page).getByText(/Enter an amount in rupees/)).toBeVisible();

    // A good amount reaches the confirm step; Back keeps the values; Cancel saves nothing.
    await fill(page, { amount: '10', reason: 'Goodwill credit' });
    await expect(popup(page).getByTestId('adjust-review')).toBeVisible();
    await popup(page).getByRole('button', { name: 'Back' }).click();
    await expect(popup(page).getByLabel('Amount (₹)')).toHaveValue('10');
    await expect(popup(page).getByLabel('Reason')).toHaveValue('Goodwill credit');
    await popup(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(popup(page)).toHaveCount(0);
  });

  test('warns, in red, before a debit takes a wallet below zero', async ({ page }) => {
    await open(page, ledger('mer_007'));
    const before = paise(await page.getByTestId('ledger-balance').innerText());

    await openAdjust(page, 'Mehta Pharma Supplies');
    await fill(page, { amount: String(before / 100 + 100), reason: 'Weight discrepancy recovery', direction: 'Debit' });

    await expect(popup(page).getByTestId('adjust-new-balance')).toHaveText(rupees(-10_000));
    await expect(popup(page).getByTestId('adjust-new-balance')).toHaveClass(/text-error/);
    await expect(popup(page).getByText('This leaves the wallet below zero.', { exact: false })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(popup(page)).toHaveCount(0);
  });

  test('answers 404 for a merchant that does not exist', async ({ page }) => {
    await signInAdmin(page);

    for (const id of ['mer_999', 'no-such-merchant']) {
      const response = await page.goto(ledger(id));
      expect(response?.status(), id).toBe(404);
    }
  });

  test('ignores a nonsense page number in the ledger URL', async ({ page }) => {
    await open(page, `${ledger('mer_001')}?page=-3`);

    await expect(page.getByRole('heading', { level: 1, name: 'Kalpa Home Decor' })).toBeVisible();
    await expect(page.getByTestId('admin-ledger').getByText(/transactions?, newest first/)).toBeVisible();
  });
});

const batch = (id: string) => `${MONEY}/cod/${id}`;
const codPopup = (page: Page, name: string) => page.getByRole('dialog', { name });

// Each project changes its own batch and exception, so the desktop and phone runs never collide.
const OWN_COD: Record<string, { reconcile: string; verify: string; credit: string; result: RegExp; exception: string }> = {
  desktop: { reconcile: 'rem_bd_1108', verify: 'rem_dl_1102', credit: '1,84,500', result: /matches the lines total/, exception: 'exc_001' },
  phone: { reconcile: 'rem_dh_1109', verify: 'rem_ek_1105', credit: '95000', result: /is short by ₹1,100\.00/, exception: 'exc_002' },
};
const ownCod = (testInfo: TestInfo) => OWN_COD[testInfo.project.name] ?? OWN_COD.desktop!;

test.describe('COD remittances', () => {
  test('shows a short batch with its difference in red, and its lines in pages', async ({ page }, testInfo) => {
    await open(page, batch('rem_ek_1105'));

    await expect(page.getByRole('heading', { level: 1, name: 'Remittance rem_ek_1105' })).toBeVisible();
    await expect(page.getByTestId('cod-status')).toHaveText('Short');
    await expect(page.getByTestId('cod-difference')).toHaveText('−₹2,100.00');
    await expect(page.getByTestId('cod-difference')).toHaveClass(/text-error/);

    const lineKind = testInfo.project.name === 'phone' ? 'admin-cod-line-card' : 'admin-cod-line-row';
    await expect(page.getByTestId(lineKind)).toHaveCount(10);
    await page.getByTestId('admin-cod-lines').getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByTestId(lineKind).first()).toBeVisible();
  });

  test('shows the difference in red on the Money page too', async ({ page }, testInfo) => {
    await open(page);
    const kind = testInfo.project.name === 'phone' ? 'admin-remittance-card' : 'admin-remittance-row';
    const short = page.getByTestId(kind).filter({ hasText: 'rem_ek_1105' });
    await expect(short.getByText('−₹2,100.00')).toHaveClass(/text-error/);
  });

  test('reconciles a paid batch once, opens exceptions and audits it', async ({ page }, testInfo) => {
    // A long flow (sign in, two submits, the audit log); under a full parallel run it needs more than 30s.
    test.slow();
    const id = ownCod(testInfo).reconcile;
    await open(page, batch(id));
    const reconcile = page.getByRole('button', { name: `Reconcile ${id}` });

    // A retry on the same server finds it already reconciled; the checks after this still apply.
    if (await reconcile.isVisible()) {
      await expect(page.getByTestId('cod-status')).toHaveText('To reconcile');
      await reconcile.click();
      const popup = codPopup(page, 'Reconcile batch');
      await expect(popup).toContainText('cannot be run again');
      await popup.getByRole('button', { name: 'Reconcile', exact: true }).click();
      await expect(popup.getByTestId('cod-saved')).toContainText('Reconciled.');
      await popup.getByRole('button', { name: 'Done' }).click();
    }

    await expect(page.getByTestId('cod-status')).toHaveText(/^(Reconciled|Short)$/);
    await expect(reconcile).toHaveCount(0);
    await expect(page.getByTestId('cod-reconciled-note')).toContainText('A batch is reconciled once.');
    await expect(page.getByTestId('admin-cod-batch-exceptions')).toBeVisible();

    await page.goto('/admin/system?action=COD+reconciled', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('admin-audit-entry').filter({ hasText: id })).toHaveCount(1);
  });

  test('offers no Reconcile on a batch already reconciled', async ({ page }) => {
    await open(page, batch('rem_dl_1102'));

    await expect(page.getByTestId('cod-status')).toHaveText('Reconciled');
    await expect(page.getByRole('button', { name: /^Reconcile/ })).toHaveCount(0);
    await expect(page.getByTestId('cod-reconciled-note')).toBeVisible();
  });

  test('checks the bank credit, after rejecting bad input', async ({ page }, testInfo) => {
    // A long flow (sign in, two submits, the audit log); under a full parallel run it needs more than 30s.
    test.slow();
    const own = ownCod(testInfo);
    await open(page, batch(own.verify));
    await page.getByRole('button', { name: `Verify bank credit for ${own.verify}` }).click();
    const popup = codPopup(page, 'Verify bank credit');

    await popup.getByLabel('Bank credit (₹)').fill('0');
    await popup.getByLabel('UTR (optional)').fill('not a utr!');
    await popup.getByRole('button', { name: 'Save' }).click();
    await expect(popup.getByText('Enter the bank credit, from ₹0.01 to ₹1,00,00,000.')).toBeVisible();
    await expect(popup.getByText('A UTR is 6 to 30 letters and digits, or leave it empty.')).toBeVisible();

    await popup.getByLabel('Bank credit (₹)').fill(own.credit);
    await popup.getByLabel('UTR (optional)').fill('');
    await popup.getByRole('button', { name: 'Save' }).click();
    await expect(popup.getByTestId('cod-saved')).toContainText(own.result);
    await popup.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('cod-bank-result')).toContainText(own.result);
  });

  test('resolves an exception only with a reason, and audits it', async ({ page }, testInfo) => {
    // A long flow (sign in, two submits, the audit log); under a full parallel run it needs more than 30s.
    test.slow();
    const exceptionId = ownCod(testInfo).exception;
    const reason = `E2E ${testInfo.project.name}: courier confirmed a partial return`;
    await open(page);
    const kind = testInfo.project.name === 'phone' ? 'admin-cod-exception-card' : 'admin-cod-exception-row';
    const row = page.locator(`[data-testid="${kind}"][data-exception-id="${exceptionId}"]`);
    const awb = (await row.locator('.font-mono').first().innerText()).trim();

    await row.getByRole('button', { name: /^Resolve/ }).click();
    const popup = codPopup(page, 'Resolve exception');
    await popup.getByLabel('Reason').fill('ok');
    await popup.getByRole('button', { name: 'Save' }).click();
    await expect(popup.getByText('Give a reason of 5 to 300 characters.')).toBeVisible();

    await popup.getByText('Written off', { exact: true }).click();
    await popup.getByLabel('Reason').fill(reason);
    await popup.getByRole('button', { name: 'Save' }).click();
    await expect(popup.getByTestId('cod-saved')).toHaveText('Written off.');
    await popup.getByRole('button', { name: 'Done' }).click();

    await expect(row).toContainText('Written off');
    await expect(row).toContainText(reason);
    await expect(row.getByRole('button', { name: /^Resolve/ })).toHaveCount(0);

    await page.goto('/admin/system?action=COD+exception+written+off', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('admin-audit-entry').filter({ hasText: reason })).toContainText(awb);
  });

  test('lists couriers past their payout date', async ({ page }) => {
    await open(page);
    const overdue = page.getByTestId('admin-overdue-row');

    await expect(overdue).toHaveCount(1);
    await expect(overdue).toContainText('Shadowfax');
    await expect(overdue).toContainText('6 days overdue');
    await overdue.getByRole('link', { name: 'Open rem_sf_1101' }).click();

    await expect(page.getByTestId('cod-status')).toHaveText('Not paid');
    await expect(page.getByText('The courier has not paid this batch yet', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: /^(Reconcile|Verify bank)/ })).toHaveCount(0);
  });

  test('answers 404 for a batch that does not exist', async ({ page }) => {
    await signInAdmin(page);
    const response = await page.goto(batch('rem_nope'));
    expect(response?.status()).toBe(404);
  });
});

test.describe('layout', () => {
  test('shows cards on phones and tables on desktop', async ({ page }, testInfo) => {
    await open(page);
    const phone = testInfo.project.name === 'phone';

    await expect(page.getByTestId('admin-wallet-card').first()).toBeVisible({ visible: phone });
    await expect(page.getByTestId('admin-wallet-row').first()).toBeVisible({ visible: !phone });
    await expect(page.getByTestId('admin-remittance-card').first()).toBeVisible({ visible: phone });
    await expect(page.getByTestId('admin-remittance-row').first()).toBeVisible({ visible: !phone });
  });

  test('gives phone buttons a 44px tap target', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone only');
    await open(page);

    const adjust = page.getByRole('button', { name: 'Adjust wallet of Kalpa Home Decor' });
    const ledgerLink = page.getByTestId('admin-wallet-card').first().getByRole('link', { name: 'Ledger' });
    const openBatch = page.getByTestId('admin-remittance-card').first().getByRole('link', { name: 'Open batch' });
    const resolve = page.getByTestId('admin-cod-exception-card').getByRole('button', { name: /^Resolve/ }).first();
    // Other tests resolve exceptions on the same server; check Resolve while one is still open.
    const targets = [adjust, ledgerLink, openBatch, ...((await resolve.count()) ? [resolve] : [])];
    for (const target of targets) {
      expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      // Drawn as a button, with a border, not as bare text.
      expect(await target.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px');
    }
  });

  for (const width of [320, 768, 1440]) {
    test(`does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await signInAdmin(page);
      for (const path of [MONEY, ledger('mer_001'), `${MONEY}/cod/rem_ek_1105`, `${MONEY}/cod/rem_sf_1101`]) {
        await page.goto(path, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0);
      }
    });
  }
});
