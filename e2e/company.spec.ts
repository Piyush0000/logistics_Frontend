import { expect, test, type Page } from '@playwright/test';
import { e2eUrl, fillDetails, openLogin, signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const COMPANY = '/settings/company';
const ACCOUNT = '123456789012';

// Saving here sets KYC to submitted for the whole server, which the Home checklist also reads.
// So this spec has a server of its own (port 3108) and the main server's Home stays untouched.
// The desktop and phone runs share that server, so each saves a brand name of its own and no test
// depends on what the other one saved.
test.use({ baseURL: e2eUrl(3108) });

const projectOf = (testInfo: { project: { name: string } }) =>
  testInfo.project.name === 'phone' ? 'phone' : 'desktop';

async function openCompany(page: Page) {
  await signIn(page);
  await page.goto(COMPANY);
  await expect(page.getByRole('heading', { level: 1, name: 'Company & KYC' })).toBeVisible();
}

const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 sample') });

async function fillValid(page: Page, project: string) {
  const fill = (label: string, value: string) => page.getByLabel(label, { exact: true }).fill(value);
  await fill('Legal business name', 'Asha Traders Private Limited');
  await fill('Brand name', `Asha Mart ${project}`);
  await fill('GSTIN', '27AAPFU0939F1ZV');
  await fill('PAN', 'AAPFU0939F');
  await fill('Contact name', 'Asha Rao');
  await fill('Contact phone', '+919811111111');
  await fill('Address line 1', '12 MG Road');
  await fill('City', 'Pune');
  await fill('State', 'Maharashtra');
  await fill('Pincode', '411001');
  await fill('Account holder name', 'Asha Traders Private Limited');
  await fill('Account number', ACCOUNT);
  await fill('IFSC', 'HDFC0001234');
}

async function addDocuments(page: Page, project: string) {
  await page.getByLabel('GST certificate', { exact: true }).setInputFiles(pdf(`gst-${project}.pdf`));
  await page.getByLabel('PAN card', { exact: true }).setInputFiles(pdf(`pan-${project}.pdf`));
  await page.getByLabel('Cancelled cheque', { exact: true }).setInputFiles(pdf(`cheque-${project}.pdf`));
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, COMPANY);
});

test('shows the page title and sample label', async ({ page }) => {
  await openCompany(page);
  await expect(page.getByTestId('company-card').getByText('Sample data')).toBeVisible();
  await expect(page.getByTestId('kyc-status')).toBeVisible();
});

test('is live in Settings and its section list', async ({ page }, testInfo) => {
  await signIn(page);
  await page.goto('/settings');
  await expect(page.getByRole('main').getByRole('link', { name: /^Company & KYC/ })).toHaveAttribute('href', COMPANY);

  await page.goto(COMPANY);
  if (projectOf(testInfo) === 'phone') {
    await expect(page.getByRole('link', { name: 'Back to Settings' })).toBeVisible();
  } else {
    const list = page.getByRole('navigation', { name: 'Settings sections' });
    await expect(list.getByRole('link', { name: 'Company & KYC' })).toHaveAttribute('aria-current', 'page');
  }
});

test('rejects bad details and shows each error under its field', async ({ page }) => {
  await openCompany(page);
  await fillValid(page, 'x');
  await page.getByLabel('GSTIN', { exact: true }).fill('27AAPFU0939F1AV');
  await page.getByLabel('IFSC', { exact: true }).fill('HDFC1001234');
  await page.getByLabel('Pincode', { exact: true }).fill('011001');
  await page.getByLabel('Account number', { exact: true }).fill('123');
  await addDocuments(page, 'x');
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click();

  await expect(page.getByText('Enter a 15-character GSTIN, such as 27AAPFU0939F1ZV.')).toBeVisible();
  await expect(page.getByText('Enter an 11-character IFSC with a 0 as the fifth character.')).toBeVisible();
  await expect(page.getByText('Indian pincodes must be 6 digits and not start with 0')).toBeVisible();
  await expect(page.getByText('Enter 9 to 18 digits.')).toBeVisible();
  await expect(page.getByText('Your details were sent for review.')).toHaveCount(0);
});

test('uppercases GSTIN, PAN and IFSC as you type and keeps only digits in the account number', async ({ page }) => {
  await openCompany(page);
  await page.getByLabel('GSTIN', { exact: true }).fill('27aapfu0939f1zv');
  await page.getByLabel('PAN', { exact: true }).fill('aapfu0939f');
  await page.getByLabel('IFSC', { exact: true }).fill('hdfc0001234');
  await page.getByLabel('Account number', { exact: true }).fill('12ab34-56');

  await expect(page.getByLabel('GSTIN', { exact: true })).toHaveValue('27AAPFU0939F1ZV');
  await expect(page.getByLabel('PAN', { exact: true })).toHaveValue('AAPFU0939F');
  await expect(page.getByLabel('IFSC', { exact: true })).toHaveValue('HDFC0001234');
  await expect(page.getByLabel('Account number', { exact: true })).toHaveValue('123456');
});

test('checks the type and size of each document', async ({ page }, testInfo) => {
  await openCompany(page);
  await fillValid(page, projectOf(testInfo));
  const submit = page.getByRole('button', { name: 'Submit for review', exact: true });
  const alert = page.getByRole('alert');

  // Which documents are already on file depends on what the other project saved, so "all three
  // are required" is covered by the unit tests. Type and size are checked whatever is on file.
  await page.getByLabel('GST certificate', { exact: true }).setInputFiles(pdf('gst.pdf'));
  await page
    .getByLabel('PAN card', { exact: true })
    .setInputFiles({ name: 'pan.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
  await page.getByLabel('Cancelled cheque', { exact: true }).setInputFiles(pdf('cheque.pdf'));
  await submit.click();
  await expect(alert.filter({ hasText: 'pan.gif is not a PDF, JPG or PNG file.' })).toBeVisible();

  await page
    .getByLabel('PAN card', { exact: true })
    .setInputFiles({ name: 'pan.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
  await submit.click();
  await expect(alert.filter({ hasText: 'pan.png is larger than 5 MB.' })).toBeVisible();
  await expect(page.getByText('Your details were sent for review.')).toHaveCount(0);
});

test('submits, masks the account number and marks the Home KYC step done', async ({ page }, testInfo) => {
  await openCompany(page);
  const project = projectOf(testInfo);
  await fillValid(page, project);
  await addDocuments(page, project);
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Your details were sent for review.' })).toBeVisible();
  await expect(page.getByTestId('kyc-status')).toHaveText('Submitted for review');
  await expect(page.getByLabel('Account number', { exact: true })).toHaveValue('');
  await expect(page.getByText("Files are not uploaded yet. Only each file's name, type and size are recorded.")).toBeVisible();

  // The other project may save at the same time, so the brand is one of the two saved ones.
  await expect(async () => {
    await page.reload();
    await expect(page.getByLabel('Brand name', { exact: true })).toHaveValue(/^Asha Mart (desktop|phone)$/);
  }).toPass();
  await expect(page.getByText('Account on file: ********9012')).toBeVisible();
  await expect(page.getByLabel('Account number', { exact: true })).toHaveValue('');
  await expect(page.getByText(ACCOUNT)).toHaveCount(0);
  expect(await page.content()).not.toContain(ACCOUNT);
  await expect(page.getByText(/^Recorded: (gst|pan|cheque)-(desktop|phone)\.pdf$/)).toHaveCount(3);

  await page.goto('/home');
  const card = page.getByTestId('checklist-card');
  await expect(card.getByText('3 of 4 done')).toBeVisible();
});

test('does not scroll sideways at any size', async ({ page }) => {
  await openCompany(page);
  await expectNoSidewaysScroll(page, SIZES);
});

test('wraps long values', async ({ page }) => {
  const longEmail = `${'a'.repeat(50)}@${'b'.repeat(40)}.example.com`;
  await openLogin(page);
  await page.getByRole('tab', { name: 'Email + Password' }).click();
  await fillDetails(page, longEmail);
  await page.locator('input[name="password"]').fill('demo-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.goto(COMPANY);

  await page.getByLabel('Legal business name', { exact: true }).fill('L'.repeat(120));
  await page.getByLabel('Address line 1', { exact: true }).fill('A'.repeat(200));
  await page.getByLabel('GST certificate', { exact: true }).setInputFiles(pdf(`${'n'.repeat(120)}.pdf`));
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await openCompany(page);

  const labels = [
    'Legal business name', 'Brand name', 'GSTIN', 'PAN', 'Contact name', 'Contact phone', 'Address line 1',
    'Address line 2 (optional)', 'City', 'State', 'Pincode', 'Account holder name', 'Account number', 'IFSC',
    'GST certificate', 'PAN card', 'Cancelled cheque',
  ];
  const fields = labels.map((label) => page.getByLabel(label, { exact: true }));
  await expectTapTargets(page, [
    page.getByRole('link', { name: 'Back to Settings' }),
    ...fields,
    page.getByRole('button', { name: 'Submit for review', exact: true }),
  ]);
  for (const field of fields.slice(0, 14)) {
    const size = await field.evaluate((el) => getComputedStyle(el).fontSize);
    expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
  }
});
