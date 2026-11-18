import { expect, test } from '@playwright/test';
import { signInAdmin } from './admin-helpers';

test.describe('admin shipments', () => {
  test.beforeEach(async ({ page }) => {
    await signInAdmin(page);
  });

  test('redirects unauthenticated visits to login', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/admin/shipments');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('displays shipments list with tabs and responsive layout', async ({ page }, testInfo) => {
    await page.goto('/admin/shipments');
    await expect(page.getByRole('heading', { level: 1, name: 'Shipments' })).toBeVisible();

    // Check category tabs
    await expect(page.getByTestId('admin-shipments-tab-all')).toBeVisible();
    await expect(page.getByTestId('admin-shipments-tab-stuck')).toBeVisible();
    await expect(page.getByTestId('admin-shipments-tab-ndr')).toBeVisible();
    await expect(page.getByTestId('admin-shipments-tab-rto')).toBeVisible();

    if (testInfo.project.name === 'phone') {
      await expect(page.getByTestId('admin-shipments-mobile')).toBeVisible();
      await expect(page.getByTestId('admin-shipment-card').first()).toBeVisible();
    } else {
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByTestId('admin-shipment-row').first()).toBeVisible();
    }
  });

  test('switches category tabs (stuck, ndr, rto)', async ({ page }) => {
    await page.goto('/admin/shipments');

    // Click Stuck only tab
    await page.getByTestId('admin-shipments-tab-stuck').click();
    await expect(page).toHaveURL(/stuck=1/);
    await expect(page.getByText('Stuck').first()).toBeVisible();

    // Click NDR reports tab
    await page.getByTestId('admin-shipments-tab-ndr').click();
    await expect(page).toHaveURL(/view=ndr/);

    // Click RTO tab
    await page.getByTestId('admin-shipments-tab-rto').click();
    await expect(page).toHaveURL(/view=rto/);
  });

  test('filters shipments dynamically by search input', async ({ page }, testInfo) => {
    await page.goto('/admin/shipments');
    const cardOrRow = testInfo.project.name === 'phone' ? 'admin-shipment-card' : 'admin-shipment-row';

    const searchInput = page.getByPlaceholder(/Search AWB, merchant, courier/i);
    await searchInput.fill('EVC240000');

    await expect(page.getByTestId(cardOrRow).getByText('EVC240000')).toBeVisible();

    // Empty search
    await searchInput.fill('nonexistent-awb-string-xyz-999');
    await expect(page.getByText('No shipments match these filters.')).toBeVisible();
  });

  test('filters shipments by status and merchant dropdowns', async ({ page }, testInfo) => {
    await page.goto('/admin/shipments');
    const cardOrRow = testInfo.project.name === 'phone' ? 'admin-shipment-card' : 'admin-shipment-row';

    // Status filter
    const statusSelect = page.getByTestId('admin-shipments-status-filter');
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('DELIVERED');
      await expect(page.getByTestId(cardOrRow).first()).toContainText(/Delivered/i);
    }

    // Merchant filter
    // Reset the status, then pick a merchant that has shipments in the sample data (mer_001 is
    // active). Picking by position broke once the list included new merchants with no shipments.
    if (await statusSelect.isVisible()) await statusSelect.selectOption('');
    const merchantSelect = page.getByTestId('admin-shipments-merchant-filter');
    await merchantSelect.selectOption('mer_001');
    await expect(page.getByTestId(cardOrRow).first()).toBeVisible();
  });

  test('answers 404 for an unknown AWB', async ({ page }) => {
    const res = await page.goto('/admin/shipments/EVC_UNKNOWN_99999');
    expect(res?.status()).toBe(404);
  });

  test('renders shipment detail page with route and tracking timeline', async ({ page }) => {
    await page.goto('/admin/shipments/EVC240000');
    await expect(page.getByRole('heading', { level: 1, name: 'EVC240000' })).toBeVisible();

    // Merchant Card
    await expect(page.getByTestId('admin-shipment-merchant')).toBeVisible();

    // Package details
    await expect(page.getByTestId('admin-shipment-package')).toBeVisible();
    await expect(page.getByText('Transit Route')).toBeVisible();
    await expect(page.getByText('Recipient')).toBeVisible();
    await expect(page.getByText('Package Weight')).toBeVisible();

    // Tracking Timeline
    await expect(page.getByTestId('admin-shipment-timeline-card')).toBeVisible();
    await expect(page.getByTestId('admin-tracking-timeline')).toBeVisible();
    await expect(page.getByTestId('admin-timeline-event').first()).toBeVisible();
  });
});
