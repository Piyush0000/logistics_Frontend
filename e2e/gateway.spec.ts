import { expect, test } from '@playwright/test';
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
