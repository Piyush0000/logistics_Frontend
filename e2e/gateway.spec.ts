import { expect, test, type Page } from '@playwright/test';
import { BULK_COLUMNS } from '../src/lib/bulk-shipments';
import { signIn } from './helpers';

test.describe('with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('shows gateway numbers with no sample label', async ({ page }) => {
    await signIn(page);
    const card = page.getByTestId('shipments-card');

    await expect(card.getByTestId('tile-In Transit')).toContainText('3');
    await expect(card.getByTestId('tile-RTO')).toContainText('13');
    await expect(card.getByText('Sample data')).toBeHidden();
  });

  test('keeps the sample label on data with no gateway route', async ({ page }) => {
    await signIn(page);

    await expect(page.getByTestId('ndr-card').getByText('Sample data')).toBeVisible();
  });

  test('finds an AWB through the gateway', async ({ page }) => {
    await signIn(page);
    const search = page.getByRole('searchbox', { name: 'Search AWB' });

    await search.fill('LIVE123, MISSING');
    await search.press('Enter');

    const results = page.getByTestId('awb-results');
    await expect(results.getByText('Jaipur')).toBeVisible();
    await expect(results.getByText('No shipment found for this AWB.')).toBeVisible();
    await expect(results.getByText('Sample data')).toBeHidden();
  });
});

test.describe('orders search with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('says gateway search covers this page only', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders?search=LIVE');

    await expect(page.getByText('Search covers the shipments on this page only.')).toBeVisible();
    await expect(page.getByText('LIVE123').first()).toBeVisible();
  });
});

test.describe('with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('explains the failure and offers a retry', async ({ page }) => {
    await signIn(page);
    const card = page.getByTestId('shipments-card');

    await expect(card.getByText('Could not reach the server. Please try again.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('keeps the rest of the dashboard working', async ({ page }) => {
    await signIn(page);

    await expect(page.getByTestId('kpi-cards')).toBeVisible();
    await expect(page.getByTestId('ndr-card')).toBeVisible();
    await expect(page.getByTestId('wallet')).toContainText('₹12,500.00');
  });

  test('shows the failure in the search results', async ({ page }) => {
    await signIn(page);
    const search = page.getByRole('searchbox', { name: 'Search AWB' });

    await search.fill('LIVE123');
    await search.press('Enter');

    await expect(
      page.getByTestId('awb-results').getByText('Could not reach the server. Please try again.'),
    ).toBeVisible();
  });
});

test.describe('with no wallet or COD route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows the wallet as unavailable, never as sample data', async ({ page }) => {
    await signIn(page);
    await page.goto('/finances/wallet', { waitUntil: 'networkidle' });

    for (const id of ['wallet-balance', 'wallet-transactions']) {
      const card = page.getByTestId(id);
      await expect(card.getByText('This data is not available yet.')).toBeVisible();
      await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
      await expect(card.getByText('Sample data')).toBeHidden();
    }
  });

  test('shows COD as unavailable, never as sample data', async ({ page }) => {
    await signIn(page);
    await page.goto('/finances/cod', { waitUntil: 'networkidle' });

    for (const id of ['cod-summary', 'cod-remittances']) {
      const card = page.getByTestId(id);
      await expect(card.getByText('This data is not available yet.')).toBeVisible();
      await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
      await expect(card.getByText('Sample data')).toBeHidden();
    }
    await expect(page.getByRole('link', { name: 'Export CSV' })).toHaveCount(0);
  });

  test('refuses to export COD with no data behind it', async ({ page }) => {
    await signIn(page);

    const response = await page.request.get('/finances/cod/export');

    expect(response.status()).toBe(503);
  });
});

test.describe('webhooks with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  const open = async (page: Page) => {
    await signIn(page);
    await page.goto('/channel-integrations', { waitUntil: 'networkidle' });
  };

  test('shows gateway webhooks with no sample label', async ({ page }) => {
    await open(page);
    const card = page.getByTestId('webhooks-card');

    await expect(card.getByText('https://hooks.example.com/live-orders')).toBeVisible();
    await expect(card.getByText('Sample data')).toBeHidden();
  });

  test('creates, edits and deletes through the gateway', async ({ page }) => {
    await open(page);
    const url = 'https://hooks.example.com/created-in-test';
    const changed = 'https://hooks.example.com/changed-in-test';

    await page.getByRole('button', { name: 'Create Webhook' }).click();
    const form = page.getByRole('dialog', { name: 'Create Webhook' });
    await form.getByLabel('Webhook URL').fill(url);
    await form.getByRole('switch', { name: 'shipment.failed' }).check();
    await form.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByTestId('signing-secret')).toHaveText('whsec_from_stub_gateway');
    await page.getByRole('button', { name: 'Done' }).click();

    await page.getByRole('button', { name: `Edit ${url}` }).click();
    const edit = page.getByRole('dialog', { name: 'Edit Webhook' });
    await edit.getByLabel('Webhook URL').fill(changed);
    await edit.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByTestId('webhooks-card').getByText(changed)).toBeVisible();

    await page.getByRole('button', { name: `Delete ${changed}` }).click();
    await page
      .getByRole('dialog', { name: 'Delete Webhook' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    await expect(page.getByTestId('webhooks-card').getByText(changed)).toHaveCount(0);
  });

  test('retries a failed delivery through the gateway', async ({ page }) => {
    await open(page);
    const row = page.getByTestId('delivery-row').first();

    await row.getByRole('button', { name: 'Retry' }).click();

    await expect(row).toContainText('Pending');
    await expect(row.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  });
});

test.describe('webhooks with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('explains the failure and offers a retry', async ({ page }) => {
    await signIn(page);
    await page.goto('/channel-integrations', { waitUntil: 'networkidle' });

    for (const id of ['webhooks-card', 'deliveries-card']) {
      const card = page.getByTestId(id);
      await expect(card.getByText('Could not reach the server. Please try again.')).toBeVisible();
      await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
      await expect(card.getByText('Sample data')).toBeHidden();
    }
    await expect(page.getByRole('button', { name: 'Create Webhook' })).toHaveCount(0);
  });
});

test.describe('home with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('shows live shipment counts from the gateway', async ({ page }) => {
    await signIn(page);
    await page.goto('/home');

    await expect(page.getByTestId('stat-in-transit')).toContainText('3');
    await expect(page.getByTestId('stat-in-transit').getByText('Sample data')).toBeHidden();
    await expect(page.getByTestId('stat-delivered')).toContainText('5');
    const recent = page.getByTestId('recent-shipments-card');
    await expect(recent.getByTestId('recent-shipment')).toHaveAttribute('href', '/orders/LIVE123');
    await expect(recent.getByText('Sample data')).toBeHidden();
  });
});

test.describe('home with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('keeps Home working when the gateway is down', async ({ page }) => {
    await signIn(page);
    await page.goto('/home');

    const recent = page.getByTestId('recent-shipments-card');
    await expect(recent.getByText('Could not reach the server. Please try again.')).toBeVisible();
    await expect(recent.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByTestId('stat-in-transit').getByText('Could not reach the server. Please try again.')).toBeVisible();
    await expect(page.getByTestId('checklist-card').getByText('2 of 4 done')).toBeVisible();
    await expect(page.getByTestId('quick-actions')).toBeVisible();
  });
});

test.describe('home with no wallet or setup route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows wallet, NDR and setup steps as unavailable, never as sample data', async ({ page }) => {
    await signIn(page);
    await page.goto('/home');

    for (const id of ['stat-wallet', 'stat-ndr', 'checklist-card']) {
      const card = page.getByTestId(id);
      await expect(card.getByText('This data is not available yet.')).toBeVisible();
      await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
      await expect(card.getByText('Sample data')).toBeHidden();
    }
  });
});

test.describe('shipments with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('shows the gateway timeline on a shipment', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/LIVE123');

    const card = page.getByTestId('timeline-card');
    await expect(card.getByText('Jaipur')).toBeVisible();
    await expect(card.getByText('Pune')).toBeVisible();
    await expect(card.getByText('Sample data')).toBeHidden();
    // Newest event first.
    await expect(card.getByRole('listitem').first()).toContainText('Jaipur');
  });

  test('explains that booking is unavailable and keeps the form', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/create');
    await page.getByLabel('Customer Name *').fill('Edited Buyer');
    await page.getByTestId('submit-shipment').click();

    await expect(
      page.getByText(
        'Booking is not available yet: Shipment creation is disabled until merchant authentication is configured',
      ),
    ).toBeVisible();
    await expect(page.getByLabel('Customer Name *')).toHaveValue('Edited Buyer');
    await expect(page.getByTestId('create-success')).toHaveCount(0);
  });
});

test.describe('shipments with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('shows the timeline error but keeps shipment facts', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/DEMOEK001');

    const card = page.getByTestId('timeline-card');
    await expect(card.getByText('Could not reach the server. Please try again.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'DEMOEK001' })).toBeVisible();
    await expect(page.getByTestId('destination-card')).toBeVisible();
  });
});

test.describe('B2C shipments with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('shows gateway shipments with no sample label', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/b2c');
    const card = page.getByTestId('b2c-card');

    await expect(card.getByText('LIVE123').first()).toBeVisible();
    await expect(page.getByText('Sample data')).toBeHidden();
  });

  test('says gateway search covers this page only', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/b2c?search=LIVE');

    await expect(page.getByText('Search covers the shipments on this page only.')).toBeVisible();
  });
});

test.describe('B2C shipments with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('shows the list error when the gateway is down', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/b2c');
    const card = page.getByTestId('b2c-card');

    await expect(card.getByText('Could not reach the server. Please try again.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'B2C Shipments' })).toBeVisible();
  });
});

test.describe('B2B with no route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows B2B as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/b2b', { waitUntil: 'networkidle' });

    const card = page.getByTestId('b2b-card');
    await expect(card.getByText('This data is not available yet.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(card.getByText('Sample data')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Create B2B shipment' })).toHaveCount(0);
  });
});

test.describe('bulk upload with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('shows the booking-unavailable message per row', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/bulk');
    const head = 'Central Hub,9876543210,42 Industrial Road,Bengaluru,Karnataka,560100';
    await page.getByLabel('Shipment file').setInputFiles({
      name: 'shipments.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        [
          BULK_COLUMNS.join(','),
          `${head},Aditi Rao,9988776655,Flat 302,,Bengaluru,Karnataka,560103,1.2,25,15,10,Keyboard,1,3499,PREPAID,0,GW-1,`,
          `${head},Ravi Kumar,9988776656,Flat 9,,Pune,Maharashtra,411001,1,20,15,10,Mouse,1,499,PREPAID,0,GW-2,`,
        ].join('\r\n'),
      ),
    });
    await expect(page.getByText('Sample data')).toHaveCount(0);
    await page.getByRole('button', { name: 'Submit 2 valid rows' }).click();

    const message =
      'Booking is not available yet: Shipment creation is disabled until merchant authentication is configured';
    const results = page.getByTestId('bulk-result');
    await expect(results).toHaveCount(2);
    await expect(results.nth(0)).toContainText(message);
    await expect(results.nth(1)).toContainText(message);
    await expect(page.getByText('0 booked, 2 not booked')).toBeVisible();
  });
});

test.describe('pickups with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('lists manifested gateway shipments as ready to ship', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/pickups');
    const card = page.getByTestId('ready-card');

    await expect(card.getByText('LIVE201').first()).toBeVisible();
    await expect(card.getByText('LIVE202').first()).toBeVisible();
    // The stand-in keeps the DELIVERED shipment out, because it is not manifested.
    await expect(card.getByText('LIVE123')).toHaveCount(0);
    await expect(card.getByText('Sample data')).toBeHidden();
  });
});

test.describe('pickups with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('shows the ready list error but keeps the page', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/pickups');
    const card = page.getByTestId('ready-card');

    await expect(card.getByText('Could not reach the server. Please try again.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Pickups & Manifests' })).toBeVisible();
    await expect(page.getByTestId('pickups-card')).toBeVisible();
  });
});

test.describe('pickups with no route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows pickups as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/pickups', { waitUntil: 'networkidle' });

    const card = page.getByTestId('pickups-card');
    await expect(card.getByText('This data is not available yet.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(card.getByText('Sample data')).toBeHidden();
    // Scheduling needs the pickup routes, so it is not offered.
    await expect(page.getByRole('button', { name: 'Schedule pickup' })).toHaveCount(0);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
  });

  test('refuses the manifest page as unavailable', async ({ page }) => {
    await signIn(page);
    await page.goto('/orders/pickups/manifest-print/pk-001');

    await expect(page.getByText('This data is not available yet.')).toBeVisible();
    await expect(page.getByTestId('sample-manifest')).toHaveCount(0);
  });
});

test.describe('invoices with no route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows invoices as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/finances/invoices', { waitUntil: 'networkidle' });

    const card = page.getByTestId('invoices-card');
    await expect(card.getByText('This data is not available yet.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText('Sample data')).toBeHidden();
    await expect(page.getByTestId('invoice-row')).toHaveCount(0);
  });

  test('refuses the print view as unavailable, with no sample banner', async ({ page }) => {
    await signIn(page);
    await page.goto('/finances/invoices/inv-2026-10');

    await expect(page.getByText('This data is not available yet.')).toBeVisible();
    await expect(page.getByText('Sample invoice. Not a tax document.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });
});

test.describe('NDR with no route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows NDR as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/ndr', { waitUntil: 'networkidle' });

    for (const id of ['ndr-kpis', 'ndr-list']) {
      const card = page.getByTestId(id);
      await expect(card.getByText('This data is not available yet.')).toBeVisible();
      await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    }
    await expect(page.getByText('Sample data')).toBeHidden();
    await expect(page.getByRole('button', { name: /Reattempt|RTO/ })).toHaveCount(0);
  });
});

test.describe('RTO with the stand-in gateway', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('shows gateway RTO shipments', async ({ page }) => {
    await signIn(page);
    await page.goto('/rto');

    await expect(page.getByTestId('tile-rto-in-progress')).toContainText('6');
    await expect(page.getByTestId('tile-rto-delivered')).toContainText('7');
    const card = page.getByTestId('rto-card');
    await expect(card.getByText('LIVE301').locator('visible=true').first()).toBeVisible();
    await expect(card.getByText('LIVE302')).toHaveCount(0);
    await expect(page.getByText('Sample data')).toBeHidden();

    await page.getByRole('tab', { name: 'Delivered' }).click();
    await page.waitForURL('**/rto?stage=delivered');
    await expect(card.getByText('LIVE302').locator('visible=true').first()).toBeVisible();
    await expect(card.getByText('LIVE301')).toHaveCount(0);
  });

  test('shows RTO charges as not available in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/rto');

    const tile = page.getByTestId('tile-rto-charges');
    await expect(tile).toContainText('Not available yet');
    await expect(tile).not.toContainText('₹');
  });

  test('links the dashboard RTO tile to the RTO screen', async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard');
    await page.getByTestId('tile-RTO').click();
    await page.waitForURL('**/rto');
  });
});

test.describe('RTO with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('shows the error when the gateway is down', async ({ page }) => {
    await signIn(page);
    await page.goto('/rto');

    for (const id of ['rto-summary', 'rto-card']) {
      const card = page.getByTestId(id);
      await expect(card.getByText('Could not reach the server. Please try again.')).toBeVisible();
      await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    }
    await expect(page.getByRole('heading', { level: 1, name: 'RTO' })).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'RTO stage' })).toBeVisible();
  });
});

test.describe('wallet recharge with no route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows recharge as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/finances/wallet?recharge=1', { waitUntil: 'networkidle' });
    const dialog = page.getByRole('dialog', { name: 'Recharge wallet' });

    await dialog.getByRole('button', { name: 'Recharge', exact: true }).click();

    await expect(dialog.getByText('This data is not available yet.')).toBeVisible();
    await expect(dialog.getByText('No payment was taken')).toBeHidden();
  });
});

test.describe('weight with no route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows weight as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/reconciliation/weight', { waitUntil: 'networkidle' });

    for (const id of ['weight-summary', 'weight-card']) {
      const card = page.getByTestId(id);
      await expect(card.getByText('This data is not available yet.')).toBeVisible();
      await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    }
    await expect(page.getByText('Sample data')).toBeHidden();
    await expect(page.getByTestId('weight-row')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Weight discrepancies' })).toBeVisible();
  });
});

test.describe('weight settings with no route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows presets as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/reconciliation/weight-settings', { waitUntil: 'networkidle' });

    const card = page.getByTestId('presets-card');
    await expect(card.getByText('This data is not available yet.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText('Sample data')).toBeHidden();
    await expect(page.getByTestId('preset-row')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add preset' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Weight settings' })).toBeVisible();
  });
});

test.describe('rate card with no route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows rates as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/tools/rate-card', { waitUntil: 'networkidle' });

    const card = page.getByTestId('rates-card');
    await expect(card.getByText('This data is not available yet.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText('Sample data')).toBeHidden();
    await expect(page.getByTestId('rate-row')).toHaveCount(0);
    await expect(page.getByTestId('rate-item')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Rate card' })).toBeVisible();
    // The zone legend is plain text, so it still explains the zones.
    await expect(page.getByTestId('zone-legend')).toBeVisible();
  });
});

test.describe('rate calculator with no route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows quotes as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/tools/rate-calculator', { waitUntil: 'networkidle' });
    await page.getByLabel('Pickup pincode').fill('110001');
    await page.getByLabel('Delivery pincode').fill('400001');
    await page.getByLabel('Weight (kg)').fill('1');
    await page.getByLabel('Length (cm)').fill('10');
    await page.getByLabel('Width (cm)').fill('10');
    await page.getByLabel('Height (cm)').fill('10');
    await page.getByRole('button', { name: 'Get quotes' }).click();

    const card = page.getByTestId('quotes-card');
    await expect(card.getByText('This data is not available yet.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText('Sample data')).toBeHidden();
    await expect(page.getByTestId('quote-item')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Rate calculator' })).toBeVisible();
  });
});

test.describe('order tracking with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('shows the gateway timeline for LIVE123', async ({ page }) => {
    await signIn(page);
    await page.goto('/tools/tracking?awb=LIVE123', { waitUntil: 'networkidle' });

    const card = page.getByTestId('tracking-card');
    await expect(card.getByText('LIVE123').first()).toBeVisible();
    await expect(card.getByTestId('status-badge')).toContainText('Delivered');
    await expect(card.getByText('Jaipur').first()).toBeVisible();
    const events = card.getByTestId('timeline-event');
    await expect(events).toHaveCount(2);
    await expect(events.first()).toContainText('Jaipur');
    await expect(events.last()).toContainText('Pune');
    await expect(page.getByText('Sample data')).toBeHidden();
  });

  test('says no shipment found for an unknown AWB', async ({ page }) => {
    await signIn(page);
    await page.goto('/tools/tracking?awb=MISSING1', { waitUntil: 'networkidle' });
    await expect(page.getByText('No shipment found for this AWB.')).toBeVisible();
  });
});

test.describe('order tracking with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('shows the error when the gateway is down', async ({ page }) => {
    await signIn(page);
    await page.goto('/tools/tracking?awb=LIVE123,LIVE124', { waitUntil: 'networkidle' });

    const items = page.getByTestId('tracking-item');
    await expect(items).toHaveCount(2);
    for (const item of await items.all()) {
      await expect(item.getByText('Could not reach the server. Please try again.')).toBeVisible();
      await expect(item.getByRole('button', { name: 'Try again' })).toBeVisible();
    }
    await expect(page.getByText('Sample data')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Order tracking' })).toBeVisible();
    await expect(page.getByLabel('AWB numbers')).toBeVisible();
  });
});

test.describe('public tracking with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  test('shows the gateway timeline', async ({ page }) => {
    const response = await page.goto('/track/LIVE123', { waitUntil: 'networkidle' });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'LIVE123' })).toBeVisible();
    await expect(page.getByTestId('status-badge')).toContainText('Delivered');
    const events = page.getByTestId('timeline-event');
    await expect(events).toHaveCount(2);
    await expect(events.first()).toContainText('Jaipur');
    await expect(events.last()).toContainText('Pune');
    await expect(page.getByText('Sample data')).toBeHidden();
  });

  test('answers 404 for an AWB the gateway does not know', async ({ page }) => {
    const response = await page.goto('/track/MISSING1');
    expect(response?.status()).toBe(404);
  });
});

test.describe('public tracking with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('shows a clear error, not a 404', async ({ page }) => {
    const response = await page.goto('/track/LIVE123', { waitUntil: 'networkidle' });
    expect(response?.status()).not.toBe(404);
    await expect(page.getByText('Could not reach the server. Please try again.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByText('Sample data')).toBeHidden();
  });
});

test.describe('reports with the gateway answering', () => {
  test.use({ baseURL: 'http://localhost:3104' });

  const RANGE = 'from=2026-10-01&to=2026-10-31';

  test('downloads gateway shipments', async ({ page }) => {
    await signIn(page);

    const response = await page.request.get(`/reports/export?type=shipments&${RANGE}`);
    const text = await response.text();

    expect(response.status()).toBe(200);
    expect(text.split('\r\n')[0]).toBe('Reference,AWB,Courier,Status,Created,Last Update');
    expect(text).toContain('LIVE123');
    expect(text).not.toContain('# Sample data');
  });

  test('combines both RTO stages', async ({ page }) => {
    await signIn(page);

    const text = await (await page.request.get(`/reports/export?type=rto&${RANGE}`)).text();

    expect(text).toContain('LIVE301');
    expect(text).toContain('LIVE302');
  });
});

test.describe('reports with the gateway down', () => {
  test.use({ baseURL: 'http://localhost:3105' });

  test('returns 503 with a plain message for shipments', async ({ page }) => {
    await signIn(page);

    const response = await page.request.get('/reports/export?type=shipments&from=2026-10-01&to=2026-10-31');

    expect(response.status()).toBe(503);
    expect(await response.text()).toBe('Could not reach the server. Please try again.');
  });
});

test.describe('reports with no COD, wallet or NDR route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('returns 503 for COD in gateway mode', async ({ page }) => {
    await signIn(page);

    for (const type of ['cod', 'wallet', 'ndr']) {
      const response = await page.request.get(`/reports/export?type=${type}&from=2026-10-01&to=2026-10-31`);

      expect(response.status(), type).toBe(503);
      expect(await response.text(), type).toBe('This data is not available yet.');
    }
  });
});

test.describe('dashboard pickups tab with no pickups route', () => {
  test.use({ baseURL: 'http://localhost:3106' });

  test('shows pickups as unavailable in gateway mode', async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard?tab=pickups', { waitUntil: 'networkidle' });

    const card = page.getByTestId('pickups-card');
    await expect(card.getByText('This data is not available yet.')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(card.getByText('Sample data')).toBeHidden();
    await expect(page.getByRole('tab', { name: 'Pickups' })).toHaveAttribute('aria-selected', 'true');
  });
});
