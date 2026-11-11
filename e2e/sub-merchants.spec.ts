import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/settings/sub-merchants';
const EMPTY = 'No sub-merchants yet. Onboard your first seller.';

// The sample sellers are shared by the desktop and phone runs, which can run at the same time, and
// by repeats and retries. Every test that onboards a seller uses a name and email of its own, finds
// the row by that exact name, and never touches the seeded rows.
const projectOf = (testInfo: TestInfo) => (testInfo.project.name === 'phone' ? 'phone' : 'desktop');
const tag = (testInfo: TestInfo) =>
  `${projectOf(testInfo)}-${testInfo.repeatEachIndex}-${testInfo.retry}-${Date.now()}`;

// A valid GSTIN no other run uses: 4 digits from the clock, project, repeat and retry, outside the seeded 1000 to 1011.
const uniqueGstin = (testInfo: TestInfo) => {
  const n = (Date.now() % 1000) * 8 + (projectOf(testInfo) === 'phone' ? 4 : 0) + (testInfo.repeatEachIndex % 2) * 2 + (testInfo.retry % 2);
  return `27AAPFU${1012 + n}F1ZV`;
};

const rows = (page: Page): Locator => page.getByTestId('sub-merchant').filter({ visible: true });
const row = (page: Page, name: string): Locator =>
  page.getByTestId('sub-merchant').filter({ has: page.getByText(name, { exact: true }) }).filter({ visible: true });

async function openPage(page: Page) {
  await signIn(page);
  await page.goto(ROUTE);
  await expect(page.getByRole('heading', { level: 1, name: 'Sub-merchants' })).toBeVisible();
}

async function fillAndSubmit(page: Page, name: string, email: string, over: { gstin?: string; account?: string } = {}) {
  await page.getByRole('button', { name: 'Onboard seller' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Onboard a seller' });
  await dialog.getByLabel('Business name').fill(name);
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('GSTIN (optional)').fill(over.gstin ?? '');
  await dialog.getByLabel('Account holder').fill('Holder Name');
  await dialog.getByLabel('Account number').fill(over.account ?? '123456789012');
  await dialog.getByLabel('IFSC').fill('HDFC0001234');
  await dialog.getByRole('button', { name: 'Onboard seller' }).click();
  return dialog;
}

async function search(page: Page, text: string) {
  await page.getByLabel('Search by name').fill(text);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
}

test.describe('sub-merchants', () => {
  test('sends signed-out visitors to login', async ({ page }) => {
    await expectSignedOutRedirect(page, ROUTE);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await openPage(page);
    await expect(page.getByTestId('sub-merchants-card').getByText('Sample data')).toBeVisible();
  });

  test('onboards a seller and lists them', async ({ page }, testInfo) => {
    await openPage(page);
    const id = tag(testInfo);
    const name = `Seller ${id}`;
    const gstin = uniqueGstin(testInfo);
    const dialog = await fillAndSubmit(page, name, `seller-${id}@example.com`, { gstin: gstin.toLowerCase() });

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: `${name} was onboarded.` })).toBeVisible();
    await search(page, name);
    const added = row(page, name);
    await expect(added).toBeVisible();
    await expect(added.getByText(`seller-${id}@example.com`, { exact: true })).toBeVisible();
    await expect(added.getByText(gstin, { exact: true })).toBeVisible();
    await expect(added.getByText('Submitted for review', { exact: true })).toBeVisible();
  });

  test('onboards a seller with no GSTIN', async ({ page }, testInfo) => {
    await openPage(page);
    const id = tag(testInfo);
    const name = `NoGst ${id}`;
    await fillAndSubmit(page, name, `nogst-${id}@example.com`);
    await search(page, name);
    await expect(row(page, name).getByText('No GSTIN', { exact: true })).toBeVisible();
  });

  test('shows only the last 4 account digits', async ({ page }, testInfo) => {
    await openPage(page);
    const id = tag(testInfo);
    const name = `Digits ${id}`;
    await fillAndSubmit(page, name, `digits-${id}@example.com`, { account: '9876543210123' });
    await search(page, name);

    const added = row(page, name);
    await expect(added.getByText('Account ending 0123', { exact: true })).toBeVisible();
    await expect(page.getByText('9876543210123')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('98765432');
  });

  test('rejects bad details and a duplicate email', async ({ page }, testInfo) => {
    await openPage(page);
    const dialog = await fillAndSubmit(page, '   ', 'not-an-email', { gstin: '123', account: '12' });
    await expect(dialog.getByText("Enter the seller's business name.")).toBeVisible();
    await expect(dialog.getByText('Enter a valid email address.')).toBeVisible();
    await expect(dialog.getByText(/15-character GSTIN/)).toBeVisible();
    await expect(dialog.getByText('Enter 9 to 18 digits.')).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel' }).click();
    const id = tag(testInfo);
    await fillAndSubmit(page, `First ${id}`, `dup-${id}@example.com`);
    await expect(page.getByRole('status').filter({ hasText: `First ${id} was onboarded.` })).toBeVisible();
    const again = await fillAndSubmit(page, `Second ${id}`, `DUP-${id}@example.com`);
    await expect(again.getByRole('alert')).toHaveText('A seller with this email is already onboarded.');
    await expect(again).toBeVisible();
  });

  test('searches by name', async ({ page }) => {
    await openPage(page);
    await search(page, 'kaveri');
    await expect(page).toHaveURL(/q=kaveri/);
    await expect(rows(page)).toHaveCount(1);
    await expect(row(page, 'Kaveri Handloom')).toBeVisible();
  });

  test('shows an empty state', async ({ page }) => {
    await openPage(page);
    await search(page, 'no seller has this name');
    await expect(page.getByText(EMPTY)).toBeVisible();
    await expect(rows(page)).toHaveCount(0);
  });

  test('pages through the list', async ({ page }) => {
    await openPage(page);
    const pagination = page.getByTestId('pagination');
    await expect(pagination).toBeVisible();
    await pagination.getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows(page).first()).toBeVisible();
  });

  test('ignores bad URL input', async ({ page }) => {
    const long = 'x'.repeat(300);
    await openPage(page);
    for (const query of ['page=abc', 'page=-1', 'page=999999', `page=${long}`]) {
      await page.goto(`${ROUTE}?${query}`);
      await expect(rows(page).first()).toBeVisible();
      await expect(page.getByText('Something went wrong')).toHaveCount(0);
    }
    await page.goto(`${ROUTE}?q=${long}`);
    await expect(page.getByText(EMPTY)).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await openPage(page);
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('wraps long values', async ({ page }, testInfo) => {
    await openPage(page);
    const id = tag(testInfo);
    const name = `${'N'.repeat(70)}${id}`;
    const email = `${'l'.repeat(40)}-${id}@${'b'.repeat(40)}.example.com`;
    await fillAndSubmit(page, name, email);
    await search(page, name);
    await expect(row(page, name)).toBeVisible();
    await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await openPage(page);
    await expectTapTargets(page, [
      page.getByRole('link', { name: 'Back to Settings' }),
      page.getByRole('button', { name: 'Onboard seller' }),
      page.getByLabel('Search by name'),
      page.getByRole('button', { name: 'Search', exact: true }),
    ]);
    await page.getByRole('button', { name: 'Onboard seller' }).click();
    const dialog = page.getByRole('dialog', { name: 'Onboard a seller' });
    const fields = ['Business name', 'Email', 'GSTIN (optional)', 'Account holder', 'Account number', 'IFSC'].map((l) =>
      dialog.getByLabel(l),
    );
    await expectTapTargets(page, [
      ...fields,
      dialog.getByRole('button', { name: 'Cancel' }),
      dialog.getByRole('button', { name: 'Onboard seller' }),
    ]);
    for (const field of fields) {
      const size = await field.evaluate((el) => getComputedStyle(el).fontSize);
      expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
    }
  });

  test('shows the section list on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop layout only');
    await openPage(page);
    const list = page.getByRole('navigation', { name: 'Settings sections' });
    await expect(list.getByRole('link', { name: 'Sub-merchants' })).toHaveAttribute('aria-current', 'page');
  });
});
