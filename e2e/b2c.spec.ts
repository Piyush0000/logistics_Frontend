import { expect, test, type Page } from '@playwright/test';
import { fillDetails, openLogin, signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const B2C = '/orders/b2c';

function rows(page: Page, projectName: string) {
  return projectName === 'phone' ? page.getByTestId('order-card') : page.getByTestId('order-row');
}

async function open(page: Page, route = B2C) {
  await signIn(page);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: 'B2C Shipments' })).toBeVisible();
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, B2C);
});

test('wraps long values', async ({ page }) => {
  const email = `${'a-very-long-merchant-name-'.repeat(4)}ops@example.com`;
  await openLogin(page);
  await page.getByRole('tab', { name: 'Email + Password' }).click();
  await fillDetails(page, email);
  await page.locator('input[name="password"]').fill('demo-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
  await page.goto(`${B2C}?search=${'x'.repeat(100)}`);
  await expect(page.getByRole('heading', { level: 1, name: 'B2C Shipments' })).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test.describe('B2C shipments', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('B2C Shipments');
    await expect(page.getByText('Single-parcel shipments to customers.')).toBeVisible();
    await expect(page.getByTestId('b2c-card').getByText('Sample data')).toBeVisible();
  });

  test('lists B2C shipments with the shared filters', async ({ page }, testInfo) => {
    const list = rows(page, testInfo.project.name);
    await expect(list.first()).toBeVisible();
    expect(await list.count()).toBeGreaterThan(1);

    await page.getByRole('tab', { name: 'Delivered', exact: true }).click();
    await page.waitForURL('**/orders/b2c?status=DELIVERED');
    await expect(list.filter({ hasText: 'DEMOEK003' })).toBeVisible();
  });

  test('links the create action to the create screen', async ({ page }) => {
    const create = page.getByRole('main').getByRole('link', { name: 'Create B2C shipment' });
    await expect(create).toHaveAttribute('href', '/orders/create');
  });

  test('shows an empty state', async ({ page }) => {
    await page.goto(`${B2C}?search=zzzz-no-match`);
    await expect(page.getByText('No B2C shipments match these filters.')).toBeVisible();
  });

  test('ignores bad URL input', async ({ page }, testInfo) => {
    for (const query of ['?page=abc', '?page=-1', '?status=FOO', '?carrier=FOO', `?search=${'q'.repeat(300)}`]) {
      const response = await page.goto(`${B2C}${query}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: 'B2C Shipments' })).toBeVisible();
      if (!query.startsWith('?search')) {
        await expect(rows(page, testInfo.project.name).first()).toBeVisible();
      }
      await expect(page.getByText('Could not reach')).toHaveCount(0);
    }
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone check');
    await expectTapTargets(page, [
      page.getByRole('main').getByRole('link', { name: 'Create B2C shipment' }),
      page.getByPlaceholder('Search AWB, Reference ID...'),
      page.getByLabel('Filter by carrier'),
      page.getByTestId('order-card').first(),
    ]);
  });
});
