import { expect, test, type Page } from '@playwright/test';
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
