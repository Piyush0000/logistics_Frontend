import { expect, test } from '@playwright/test';
import { signInAdmin } from './admin-helpers';

test.describe('admin merchants', () => {
  test.beforeEach(async ({ page }) => {
    await signInAdmin(page);
  });

  test('displays merchants list with filters and responsive view', async ({ page }, testInfo) => {
    await page.goto('/admin/merchants');
    await expect(page.getByRole('heading', { level: 1, name: 'Merchants' })).toBeVisible();

    if (testInfo.project.name === 'phone') {
      // On phones, mobile cards are visible and wide table is hidden
      await expect(page.getByTestId('admin-merchants-mobile')).toBeVisible();
      await expect(page.getByTestId('admin-merchant-card').first()).toBeVisible();
    } else {
      // On desktop, table is visible
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByTestId('admin-merchant-row').first()).toBeVisible();
    }
  });

  test('filters merchants by status tab', async ({ page }, testInfo) => {
    await page.goto('/admin/merchants');
    await page.getByRole('tab', { name: 'Suspended' }).click();
    await expect(page).toHaveURL(/status=suspended/);

    const selector = testInfo.project.name === 'phone' ? 'admin-merchant-card' : 'admin-merchant-row';
    const suspendedItems = page.getByTestId(selector);
    if ((await suspendedItems.count()) > 0) {
      await expect(suspendedItems.first()).toContainText('suspended');
    }
  });

  test('filters merchants by search query and shows empty state for no match', async ({ page }) => {
    await page.goto('/admin/merchants');
    const searchInput = page.getByPlaceholder(/Search merchant name/i);
    await searchInput.fill('xyz-nonexistent-search-query-12345');
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/q=xyz-nonexistent/);
    await expect(page.getByText('No merchants match these filters.')).toBeVisible();
  });

  test('answers 404 for an unknown merchant id', async ({ page }) => {
    const res = await page.goto('/admin/merchants/mer_unknown_99999');
    expect(res?.status()).toBe(404);
  });

  test('opens merchant detail page, displays wallet tile, and can suspend/reactivate', async ({ page }) => {
    await page.goto('/admin/merchants/mer_001');
    expect(page.url()).toContain('/admin/merchants/mer_001');

    await expect(page.getByTestId('admin-merchant-profile')).toBeVisible();
    await expect(page.getByTestId('admin-merchant-wallet')).toBeVisible();
    await expect(page.getByTestId('admin-merchant-shipments')).toBeVisible();

    // Check suspend button and dialog
    const statusBtn = page.getByTestId('admin-merchant-status-button');
    await expect(statusBtn).toBeVisible();

    const isSuspended = (await statusBtn.textContent())?.includes('Reactivate');
    await statusBtn.click();

    // Dialog should open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill reason
    await page.getByLabel(/Reason/i).fill(isSuspended ? 'Restoring active merchant services' : 'Temporary operational freeze');
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Dialog closes and button text reflects change
    await expect(dialog).toBeHidden();
    await expect(statusBtn).toContainText(isSuspended ? 'Suspend merchant' : 'Reactivate merchant');
  });
});

