import { expect, test, type Page } from '@playwright/test';
import { signIn, fillDetails, openLogin } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/settings/tracking-page';

// Nothing else reads these settings (the public page is not connected yet), so saving here cannot
// change what other specs see. The desktop and phone runs share the mock store, so each saves a
// display name of its own and no test depends on what the other one saved.
const projectOf = (testInfo: { project: { name: string } }) =>
  testInfo.project.name === 'phone' ? 'phone' : 'desktop';

async function openPage(page: Page) {
  await signIn(page);
  await page.goto(ROUTE);
  await expect(page.getByRole('heading', { level: 1, name: 'Tracking Page' })).toBeVisible();
}

const preview = (page: Page) => page.getByTestId('tracking-preview');
const png = (name: string, size = 100) => ({ name, mimeType: 'image/png', buffer: Buffer.alloc(size) });

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, ROUTE);
});

test('shows the page title and sample label', async ({ page }) => {
  await openPage(page);
  await expect(page.getByTestId('tracking-page-card').getByText('Sample data').first()).toBeVisible();
  await expect(page.getByText('Changes apply to the public page once tracking-page settings are connected.')).toBeVisible();
});

test('is live in Settings and its section list', async ({ page }, testInfo) => {
  await signIn(page);
  await page.goto('/settings');
  await expect(page.getByRole('main').getByRole('link', { name: /^Tracking Page/ })).toHaveAttribute('href', ROUTE);
  await page.goto(ROUTE);
  if (projectOf(testInfo) === 'phone') {
    await expect(page.getByRole('link', { name: 'Back to Settings' })).toBeVisible();
  } else {
    const list = page.getByRole('navigation', { name: 'Settings sections' });
    await expect(list.getByRole('link', { name: 'Tracking Page' })).toHaveAttribute('aria-current', 'page');
  }
});

test('previews the display name live', async ({ page }) => {
  await openPage(page);
  await page.getByLabel('Display name', { exact: true }).fill('Live Preview Co');
  await expect(preview(page).getByText('Live Preview Co')).toBeVisible();
  await expect(preview(page).getByText('DEMOEK001')).toBeVisible();
});

test('offers only palette accents', async ({ page }) => {
  await openPage(page);
  const group = page.getByRole('radiogroup', { name: 'Accent colour' });
  await expect(group.getByRole('radio')).toHaveCount(3);
  await expect(group.getByRole('radio', { name: 'Primary blue' })).toBeAttached();
  await expect(group.getByRole('radio', { name: 'Sky blue' })).toBeAttached();
  await expect(group.getByRole('radio', { name: 'Green' })).toBeAttached();
  await group.getByText('Green', { exact: true }).click();
  await expect(preview(page)).toHaveAttribute('data-accent', 'success');
});

test('hides the courier in the preview when switched off', async ({ page }) => {
  await openPage(page);
  const toggle = page.getByLabel('Show the courier name', { exact: true });
  await toggle.check();
  await expect(preview(page).getByTestId('preview-courier')).toBeVisible();
  await toggle.uncheck();
  await expect(preview(page).getByTestId('preview-courier')).toHaveCount(0);
});

test('rejects a 2 MB logo', async ({ page }) => {
  await openPage(page);
  await page.getByLabel('Logo', { exact: true }).setInputFiles(png('big.png', 2 * 1024 * 1024));
  await expect(page.getByText('big.png is larger than 1 MB.')).toBeVisible();
  await page.getByLabel('Logo', { exact: true }).setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: Buffer.alloc(10) });
  await expect(page.getByText('a.gif is not a PNG or SVG file.')).toBeVisible();
});

test('shows each validation error under its field', async ({ page }) => {
  await openPage(page);
  await page.getByLabel('Display name', { exact: true }).fill('');
  await page.getByLabel('Support email', { exact: true }).fill('nope');
  await page.getByLabel('Support phone', { exact: true }).fill('123');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Enter a display name.')).toBeVisible();
  await expect(page.getByText('Enter a valid email address, such as help@example.com.')).toBeVisible();
  await expect(page.getByText('Enter 10 to 15 digits, with an optional + at the start.', { exact: true })).toBeVisible();
  await expect(page.getByText('Tracking page settings saved.')).toHaveCount(0);
});

test('saves, keeps the logo name and shows it after reload', async ({ page }, testInfo) => {
  await openPage(page);
  const project = projectOf(testInfo);
  await page.getByLabel('Display name', { exact: true }).fill(`Asha ${project}`);
  await page.getByLabel('Logo', { exact: true }).setInputFiles(png(`logo-${project}.png`));
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Tracking page settings saved.' })).toBeVisible();

  await expect(async () => {
    await page.reload();
    await expect(page.getByLabel('Display name', { exact: true })).toHaveValue(/^Asha (desktop|phone)$/);
  }).toPass();
  await expect(page.getByText(/^Logo on file: logo-(desktop|phone)\.png$/)).toBeVisible();
});

test('shows merchant text as plain text, never as markup', async ({ page }) => {
  await openPage(page);
  await page.getByLabel('Display name', { exact: true }).fill('<img src=x onerror=alert(1)>');
  await expect(preview(page).getByText('<img src=x onerror=alert(1)>')).toBeVisible();
  await expect(preview(page).locator('img')).toHaveCount(0);
});

test('does not scroll sideways at any size', async ({ page }) => {
  await openPage(page);
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
  await page.goto(ROUTE);
  await page.getByLabel('Display name', { exact: true }).fill('W'.repeat(40));
  await page.getByLabel('Support email', { exact: true }).fill(longEmail);
  await page.getByLabel('Logo', { exact: true }).setInputFiles(png(`${'n'.repeat(120)}.png`));
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await openPage(page);
  const labels = ['Display name', 'Support email', 'Support phone', 'Logo'];
  const fields = labels.map((label) => page.getByLabel(label, { exact: true }));
  await expectTapTargets(page, [
    page.getByRole('link', { name: 'Back to Settings' }),
    ...fields,
    // The checkbox and the colour options are small controls inside labels, and the label is the tap target.
    page.locator('label', { hasText: 'Show the courier name' }),
    ...(await page.getByRole('radiogroup', { name: 'Accent colour' }).locator('label').all()),
    page.getByRole('button', { name: 'Save changes', exact: true }),
  ]);
  for (const field of fields.slice(0, 3)) {
    const size = await field.evaluate((el) => getComputedStyle(el).fontSize);
    expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
  }
});
