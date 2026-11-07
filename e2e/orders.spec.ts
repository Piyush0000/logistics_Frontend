import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.describe('Orders screen', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test.describe('shipment list', () => {
    test('renders orders list with sample badge and controls', async ({ page }) => {
      await page.goto('/orders');
      await expect(page.getByRole('heading', { level: 1, name: 'Shipments & Orders' })).toBeVisible();
      await expect(page.getByText('Sample data')).toBeVisible();

      // Check create button and NDR link
      await expect(page.getByRole('link', { name: 'Create Shipment' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'NDR' })).toBeVisible();

      // Status tabs
      await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Delivered' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'In Transit' })).toBeVisible();
    });

    test('filters list by status tabs', async ({ page }, testInfo) => {
      await page.goto('/orders');
      await page.getByRole('tab', { name: 'Delivered' }).click();
      await page.waitForURL('**/orders?status=DELIVERED');

      // Check that delivered item appears and others are filtered
      const container = testInfo.project.name === 'phone' ? page.getByTestId('order-card') : page.getByTestId('order-row');
      await expect(container.filter({ hasText: 'DEMOEK003' })).toBeVisible();
    });

    test('filters list by carrier dropdown', async ({ page }, testInfo) => {
      await page.goto('/orders');
      await page.getByLabel('Filter by carrier').selectOption('delhivery');
      await page.waitForURL('**/orders?carrier=delhivery');

      const container = testInfo.project.name === 'phone' ? page.getByTestId('order-card') : page.getByTestId('order-row');
      await expect(container.filter({ hasText: 'DEMODL002' })).toBeVisible();
    });

    test('searches shipments by AWB', async ({ page }, testInfo) => {
      await page.goto('/orders');
      const searchInput = page.getByPlaceholder('Search AWB, Reference ID...');
      await searchInput.fill('DEMOSF004');
      await searchInput.press('Enter');
      await page.waitForURL('**/orders?search=DEMOSF004');

      const container = testInfo.project.name === 'phone' ? page.getByTestId('order-card') : page.getByTestId('order-row');
      await expect(container.filter({ hasText: 'DEMOSF004' })).toBeVisible();
    });
  });

  test.describe('shipment detail', () => {
    test('shows order tracking timeline, addresses, and package items', async ({ page }) => {
      await page.goto('/orders/DEMOEK001');

      await expect(page.getByRole('heading', { level: 1, name: 'DEMOEK001' })).toBeVisible();
      await expect(page.getByText('Sample data')).toBeVisible();

      // Check sections
      await expect(page.getByTestId('timeline-card')).toBeVisible();
      await expect(page.getByTestId('items-card')).toBeVisible();
      await expect(page.getByTestId('destination-card')).toBeVisible();
      await expect(page.getByTestId('origin-card')).toBeVisible();

      // Check package details
      await expect(page.getByText('Ergonomic Keyboard')).toBeVisible();
      await expect(page.getByText('Aditi Rao')).toBeVisible();

      // Check back link
      await page.getByRole('link', { name: 'Back to Orders' }).click();
      await page.waitForURL('**/orders');
    });

    test('shows 404 for non-existent shipment', async ({ page }) => {
      const response = await page.goto('/orders/NON_EXISTENT_AWB');
      expect(response?.status()).toBe(404);
    });
  });

  test.describe('create shipment', () => {
    test('renders create shipment form with sample badge', async ({ page }) => {
      await page.goto('/orders/create');
      await expect(page.getByRole('heading', { level: 1, name: 'Create New Shipment' })).toBeVisible();
      await expect(page.getByText('Sample data')).toBeVisible();

      await expect(page.getByLabel('Customer Name *')).toBeVisible();
      await expect(page.getByLabel('Phone (10-15 digits) *').first()).toBeVisible();
      await expect(page.getByTestId('submit-shipment')).toBeVisible();
    });

    test('creates a shipment and shows confirmation with new AWB', async ({ page }) => {
      await page.goto('/orders/create');

      // Submit prefilled valid form
      await page.getByTestId('submit-shipment').click();

      // Should show success confirmation
      await expect(page.getByTestId('create-success')).toBeVisible();
      await expect(page.getByText('Shipment Booked Successfully!')).toBeVisible();
      await expect(page.getByRole('link', { name: 'View Shipment Details' })).toBeVisible();
    });
  });

  test.describe('NDR management', () => {
    test('renders NDR dashboard with KPI cards and sample badge', async ({ page }) => {
      await page.goto('/ndr');
      await expect(page.getByRole('heading', { level: 1, name: 'Non-Delivery Reports (NDR)' })).toBeVisible();
      await expect(page.getByText('Sample data')).toBeVisible();

      await expect(page.getByTestId('ndr-kpis')).toBeVisible();
      await expect(page.getByTestId('ndr-kpis').getByText('Action Required')).toBeVisible();
      await expect(page.getByTestId('ndr-kpis').getByText('Re-attempted')).toBeVisible();
      await expect(page.getByTestId('ndr-kpis').getByText('NDR Delivered')).toBeVisible();
      await expect(page.getByTestId('ndr-kpis').getByText('NDR Returned')).toBeVisible();
    });

    test('opens action modal for reattempt and logs action', async ({ page }) => {
      await page.goto('/ndr');

      const reattemptBtn = page.getByRole('button', { name: 'Reattempt' }).first();
      await expect(reattemptBtn).toBeVisible();
      await reattemptBtn.click();

      // Modal appears
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Request Re-attempt' })).toBeVisible();

      // Fill instructions and confirm
      await page.getByPlaceholder('e.g. Call customer at 9876543210 before attempting').fill('Call customer before arriving');
      await page.getByRole('button', { name: 'Confirm Action' }).click();

      // Dialog confirms action
      await expect(page.getByText('Successfully requested Reattempt')).toBeVisible();
    });
  });

  test.describe('layout & responsiveness', () => {
    const viewports = [
      { width: 320, height: 568 },
      { width: 360, height: 640 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ];

    for (const { width, height } of viewports) {
      test(`does not scroll sideways at ${width}x${height} on /orders`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/orders');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(width);
      });

      test(`does not scroll sideways at ${width}x${height} on /orders/create`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/orders/create');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(width);
      });

      test(`does not scroll sideways at ${width}x${height} on /ndr`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/ndr');

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(width);
      });
    }

    test('tap targets on mobile are at least 44px tall', async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'phone', 'Phone check');
      await page.goto('/orders');

      // Check create shipment link height
      const createBox = await page.getByRole('link', { name: 'Create Shipment' }).boundingBox();
      expect(createBox?.height).toBeGreaterThanOrEqual(44);

      // Check NDR link height
      const ndrBox = await page.getByRole('link', { name: 'NDR' }).boundingBox();
      expect(ndrBox?.height).toBeGreaterThanOrEqual(44);

      // Check order card on phone
      const cardBox = await page.getByTestId('order-card').first().boundingBox();
      expect(cardBox?.height).toBeGreaterThanOrEqual(44);
    });
  });
});

