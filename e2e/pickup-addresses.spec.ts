import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/settings/pickup-addresses';
const CREATE = '/orders/create';

// The sample addresses are shared by the desktop and phone runs, and by Create Shipment, Pickups and
// B2B. So these tests only read the seeded rows. Each run adds rows of its own, named by project,
// repeat and retry, and deletes them. The default is never changed here (the action tests cover it),
// because the pickups tests rely on the seeded default.
const projectOf = (testInfo: TestInfo) => (testInfo.project.name === 'phone' ? 'phone' : 'desktop');
const runOf = (testInfo: TestInfo) => testInfo.repeatEachIndex * (testInfo.project.retries + 1) + testInfo.retry;
const labelFor = (testInfo: TestInfo, kind: string) => `T27 ${projectOf(testInfo)} r${runOf(testInfo)} ${kind}`;

const items = (page: Page) => page.getByTestId('address-item');
const itemFor = (page: Page, label: string) =>
  items(page).filter({ has: page.getByRole('heading', { level: 3, name: label, exact: true }) });

async function open(page: Page) {
  await signIn(page);
  await page.goto(ROUTE);
  await expect(page.getByRole('heading', { level: 1, name: 'Pickup Addresses' })).toBeVisible();
}

function formDialog(page: Page) {
  return page.getByRole('dialog', { name: /pickup address$/ });
}

async function fillForm(page: Page, label: string, overrides: Record<string, string> = {}) {
  const dialog = formDialog(page);
  const values: Record<string, string> = {
    Label: label,
    'Contact name': 'Test Depot',
    Phone: '9822000000',
    'Address line 1': '1 Test Road',
    City: 'Pune',
    State: 'Maharashtra',
    Pincode: '411001',
    ...overrides,
  };
  for (const [name, value] of Object.entries(values)) await dialog.getByLabel(name, { exact: true }).fill(value);
}

async function addAddress(page: Page, label: string, overrides: Record<string, string> = {}) {
  await page.getByRole('button', { name: 'Add address' }).click();
  await fillForm(page, label, overrides);
  await formDialog(page).getByRole('button', { name: 'Save address' }).click();
  await expect(formDialog(page)).toHaveCount(0);
  await expect(itemFor(page, label)).toBeVisible();
}

async function deleteAddress(page: Page, label: string) {
  await itemFor(page, label).getByRole('button', { name: `Delete ${label}`, exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Delete pickup address' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(itemFor(page, label)).toHaveCount(0);
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, ROUTE);
});

test('shows the page title and sample label', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('addresses-card').getByText('Sample data')).toBeVisible();
  await expect(itemFor(page, 'Bengaluru warehouse')).toContainText('Default');
  await expect(itemFor(page, 'Gurugram store')).toContainText('Gurugram');
});

test('opens Pickup Addresses from Settings', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings');
  await page.getByRole('main').getByRole('link', { name: /^Pickup Addresses/ }).click();
  await expect(page).toHaveURL(/\/settings\/pickup-addresses$/);
});

test('does not scroll sideways at any size', async ({ page }) => {
  await open(page);
  await expectNoSidewaysScroll(page, SIZES);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await open(page);
  await expectTapTargets(page, [
    page.getByRole('link', { name: 'Back to Settings' }),
    page.getByRole('button', { name: 'Add address' }),
    page.getByRole('button', { name: 'Edit Gurugram store', exact: true }),
    page.getByRole('button', { name: 'Delete Gurugram store', exact: true }),
    page.getByRole('button', { name: 'Make Gurugram store default', exact: true }),
  ]);
  await page.getByRole('button', { name: 'Add address' }).click();
  const dialog = formDialog(page);
  const fields = ['Label', 'Contact name', 'Phone', 'Address line 1', 'Address line 2', 'City', 'State', 'Pincode'].map(
    (name) => dialog.getByLabel(name, { exact: true }),
  );
  await expectTapTargets(page, [...fields, dialog.getByRole('button', { name: 'Save address' })]);
  for (const field of fields) {
    expect(parseFloat(await field.evaluate((el) => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  }
});

test('offers make default only on the other addresses', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('button', { name: 'Make Bengaluru warehouse default', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Make Gurugram store default', exact: true })).toBeVisible();
});

test('refuses to delete the only default', async ({ page }) => {
  await open(page);
  await itemFor(page, 'Bengaluru warehouse')
    .getByRole('button', { name: 'Delete Bengaluru warehouse', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Delete pickup address' });
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Choose another default address before deleting this one.');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(itemFor(page, 'Bengaluru warehouse')).toBeVisible();
});

test('adds, edits and deletes an address', async ({ page }, testInfo) => {
  await open(page);
  const label = labelFor(testInfo, 'crud');
  await addAddress(page, label);
  await expect(itemFor(page, label)).toContainText('Pune');
  await expect(itemFor(page, label)).not.toContainText('Default');

  await itemFor(page, label).getByRole('button', { name: `Edit ${label}`, exact: true }).click();
  await expect(formDialog(page).getByLabel('City', { exact: true })).toHaveValue('Pune');
  await formDialog(page).getByLabel('City', { exact: true }).fill('Nashik');
  await formDialog(page).getByRole('button', { name: 'Save address' }).click();
  await expect(itemFor(page, label)).toContainText('Nashik');

  await page.reload();
  await expect(itemFor(page, label)).toContainText('Nashik');
  await deleteAddress(page, label);
});

test('rejects a bad label, pincode and phone', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Add address' }).click();
  const dialog = formDialog(page);

  await fillForm(page, 'x'.repeat(41), { Pincode: '012345', Phone: '123' });
  await dialog.getByRole('button', { name: 'Save address' }).click();
  await expect(dialog.getByText('Label must be 1 to 40 characters.')).toBeVisible();
  await expect(dialog.getByText('Indian pincodes must be 6 digits and not start with 0.')).toBeVisible();
  await expect(dialog.getByText('Enter 10 to 15 digits, with an optional + at the start.')).toBeVisible();
  await expect(dialog).toBeVisible();
});

test('wraps long values', async ({ page }, testInfo) => {
  await open(page);
  const label = labelFor(testInfo, 'long').padEnd(40, 'W');
  await addAddress(page, label, {
    'Address line 1': 'L'.repeat(150),
    City: 'C'.repeat(90),
    'Contact name': 'N'.repeat(100),
  });
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  await deleteAddress(page, label);
});

test('fills origin from a saved address on Create Shipment', async ({ page }) => {
  await signIn(page);
  await page.goto(CREATE);
  const select = page.getByLabel('Use saved address');
  await expect(select).toBeVisible();
  await select.selectOption({ label: 'Gurugram store, Gurugram' });

  await expect(page.locator('#origin_name')).toHaveValue('North Store');
  await expect(page.locator('#origin_phone')).toHaveValue('9811000111');
  await expect(page.locator('#origin_pincode')).toHaveValue('122001');
  await expect(page.locator('#origin_line1')).toHaveValue('12, Sector 29 Market');
  await expect(page.locator('#origin_city')).toHaveValue('Gurugram');
  await expect(page.locator('#origin_state')).toHaveValue('Haryana');

  // The delivery side is not touched.
  await expect(page.locator('#destination_city')).toHaveValue('Mumbai');
});
