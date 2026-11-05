import { expect, test, type Page } from '@playwright/test';
import { DEMO_EMAIL, signIn } from './helpers';

const NAV_ITEMS = [
  'Overview',
  'Orders',
  'NDR',
  'Weight Discrepancy',
  'Finances',
  'Buyer Experience',
  'Business Tools',
  'KYC Info',
  'Get Support',
  'Channel Integrations',
];

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });

async function openSidebar(page: Page, isPhone: boolean) {
  await page.getByRole('button', { name: isPhone ? 'Open menu' : 'Expand sidebar' }).click();
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test.describe('overview', () => {
  test('shows the title with Overview selected and other tabs disabled', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    for (const name of ['Pickups', 'NDR', 'RTO', 'Delivered', 'Revenue', 'SMS']) {
      await expect(page.getByRole('tab', { name })).toBeDisabled();
    }
  });

  test('shows the four KPI cards', async ({ page }) => {
    const cards = page.getByTestId('kpi-cards');

    for (const label of ["Today's Order", "Today's Revenue", 'Average Shipping', "Today's Delivery"]) {
      await expect(cards.getByText(label)).toBeVisible();
    }
    await expect(cards.getByText('₹18,450')).toBeVisible();
  });

  test('shows shipment counts under the agreed labels', async ({ page }) => {
    const card = page.getByTestId('shipments-card');

    await expect(card.getByRole('heading', { name: 'Shipments Details' })).toBeVisible();
    for (const [label, value] of [
      ['To Be Processed', '12'],
      ['Ready to Ship', '8'],
      ['In Transit', '34'],
      ['Out for Delivery', '9'],
      ['Delivered', '126'],
      ['RTO', '7'],
    ] as const) {
      await expect(card.getByTestId(`tile-${label}`)).toContainText(value);
    }
  });

  test('shows the NDR tiles', async ({ page }) => {
    const card = page.getByTestId('ndr-card');

    for (const label of ['NDR Order', 'Re-attempted', 'NDR Delivered', 'NDR Returned']) {
      await expect(card.getByText(label)).toBeVisible();
    }
  });

  test('labels every piece of sample data', async ({ page }) => {
    for (const id of ['kpi-section', 'shipments-card', 'ndr-card', 'wallet']) {
      await expect(page.getByTestId(id).getByText(/^Sample( data)?$/)).toBeVisible();
    }
  });

  test('explains why the date range is disabled', async ({ page }) => {
    await expect(page.getByRole('button', { name: /\d{2}\.\d{2}\.\d{4} - / })).toBeDisabled();
    await expect(page.getByText('Date filter is not available yet.')).toBeVisible();
  });

  test('shows a labelled sample notice in the ticker', async ({ page }) => {
    await expect(page.getByTestId('ticker').getByText('Sample notice:').first()).toBeVisible();
  });

  test('does not show the reference brand or its data', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText(/sharkship|jeetendra|festive|surcharge/i);
  });
});

test.describe('sidebar', () => {
  test('lists every section, with only Overview available', async ({ page }, testInfo) => {
    await openSidebar(page, testInfo.project.name === 'phone');

    for (const name of NAV_ITEMS) {
      await expect(nav(page).getByText(name, { exact: true })).toBeVisible();
    }
    await expect(nav(page).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(nav(page).getByRole('button', { name: 'Orders' })).toBeDisabled();
  });

  test('shows the user and sign out at the bottom', async ({ page }, testInfo) => {
    await openSidebar(page, testInfo.project.name === 'phone');

    await expect(page.getByTestId('sidebar-user').getByText('ops', { exact: true })).toBeVisible();
    await expect(page.getByTestId('sidebar-user').getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  test('starts as an icon rail and overlays the page when expanded', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop behaviour');
    const sidebar = page.getByTestId('sidebar');
    const before = await page.getByTestId('shipments-card').boundingBox();

    await expect(sidebar).toHaveCSS('width', '80px');
    await expect(nav(page).getByText('Orders', { exact: true })).toBeHidden();

    await openSidebar(page, false);
    await expect(sidebar).toHaveCSS('width', '320px');

    expect((await page.getByTestId('shipments-card').boundingBox())?.x).toBe(before?.x);
  });

  test('collapses with its button, Escape or a click outside', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop behaviour');
    const sidebar = page.getByTestId('sidebar');

    await openSidebar(page, false);
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(sidebar).toHaveCSS('width', '80px');

    await openSidebar(page, false);
    await page.keyboard.press('Escape');
    await expect(sidebar).toHaveCSS('width', '80px');

    await openSidebar(page, false);
    await page.getByRole('heading', { level: 1 }).click({ position: { x: 400, y: 5 }, force: true });
    await expect(sidebar).toHaveCSS('width', '80px');
  });

  test('is a slide-in menu on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone behaviour');
    const link = nav(page).getByRole('link', { name: 'Overview' });

    await expect(link).toBeHidden();

    await openSidebar(page, true);
    await expect(link).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();

    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(link).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });

  test('closes the phone menu with Escape or the backdrop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone behaviour');
    const link = nav(page).getByRole('link', { name: 'Overview' });

    await openSidebar(page, true);
    await page.keyboard.press('Escape');
    await expect(link).toBeHidden();

    await openSidebar(page, true);
    await page.getByTestId('sidebar-backdrop').click({ position: { x: 380, y: 400 } });
    await expect(link).toBeHidden();
  });
});

test.describe('top bar', () => {
  test('shows the wallet balance and refreshes it', async ({ page }) => {
    const wallet = page.getByTestId('wallet');

    await expect(wallet).toContainText('₹12,500.00');
    await page.getByRole('button', { name: 'Refresh balance' }).click();
    await expect(wallet).toContainText('₹12,500.00');
  });

  test('offers Create shipment as unavailable in the Quick menu', async ({ page }) => {
    await page.getByRole('button', { name: 'Quick' }).click();

    await expect(page.getByRole('menuitem', { name: 'Create shipment' })).toBeDisabled();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitem', { name: 'Create shipment' })).toBeHidden();
  });

  test('shows the account and signs out', async ({ page }) => {
    await page.getByRole('button', { name: 'Account menu' }).click();

    await expect(page.getByText(`Signed in as ${DEMO_EMAIL}`)).toBeVisible();

    await page.getByRole('menu').getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL('**/login');
  });
});

test.describe('AWB search', () => {
  const search = (page: Page) => page.getByRole('searchbox', { name: 'Search AWB' });

  test('finds a sample AWB', async ({ page }) => {
    await search(page).fill('DEMOEK001');
    await search(page).press('Enter');

    const results = page.getByTestId('awb-results');
    await expect(results.getByText('In transit')).toBeVisible();
    await expect(results.getByText('Pune hub')).toBeVisible();
    await expect(results.getByText('Sample data')).toBeVisible();
  });

  test('searches several AWBs and explains the unknown one', async ({ page }) => {
    await search(page).fill('DEMOEK001, DEMODL002, NOPE');
    await search(page).press('Enter');

    const results = page.getByTestId('awb-results');
    await expect(results.getByText('In transit')).toBeVisible();
    await expect(results.getByText('Out for delivery')).toBeVisible();
    await expect(results.getByText('No shipment found for this AWB.')).toBeVisible();
  });

  test('fits the search hint to the screen and hides it while typing', async ({
    page,
  }, testInfo) => {
    const hint =
      testInfo.project.name === 'phone' ? 'Search AWB' : 'Search AWB separated by comma';

    await expect(page.getByText(hint, { exact: true })).toBeVisible();

    await search(page).fill('DEMOEK001');
    await expect(page.getByText(hint, { exact: true })).toBeHidden();
  });

  test('does nothing for a blank search', async ({ page }) => {
    await search(page).press('Enter');

    await expect(page.getByTestId('awb-results')).toBeHidden();
  });

  test('closes the results with Escape', async ({ page }) => {
    await search(page).fill('DEMOEK001');
    await search(page).press('Enter');
    await page.getByTestId('awb-results').waitFor();

    await page.keyboard.press('Escape');

    await expect(page.getByTestId('awb-results')).toBeHidden();
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
      await page.reload();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('keeps KPI cards two per row on phones and four on wide screens', async ({
    page,
  }, testInfo) => {
    const row = await page.getByTestId('kpi-cards').evaluate((grid) => {
      return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    });

    expect(row).toBe(testInfo.project.name === 'phone' ? 2 : 4);
  });

  test('keeps KPI values level across a row', async ({ page }) => {
    const cards = page.getByTestId('kpi-cards');
    const order = await cards.getByText('24 Orders').boundingBox();
    const revenue = await cards.getByText('₹18,450').boundingBox();

    expect(order?.y).toBe(revenue?.y);
  });

  test('keeps every tap target at least 44px tall on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');

    for (const target of [
      page.getByRole('button', { name: 'Open menu' }),
      page.getByRole('button', { name: 'Quick' }),
      page.getByRole('button', { name: 'Refresh balance' }),
      page.getByRole('button', { name: 'Account menu' }),
      page.getByRole('searchbox', { name: 'Search AWB' }),
    ]) {
      expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('swipes the tabs inside their own bar on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');

    const scrolls = await page
      .getByRole('tablist')
      .evaluate((list) => list.scrollWidth > list.clientWidth);

    expect(scrolls).toBe(true);
  });
});
