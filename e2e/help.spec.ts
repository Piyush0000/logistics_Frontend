import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/support/help';
const isPhone = (testInfo: { project: { name: string } }) => testInfo.project.name === 'phone';

async function open(page: Page, route = ROUTE) {
  await signIn(page);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: 'Help centre' })).toBeVisible();
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, ROUTE);
  await expectSignedOutRedirect(page, `${ROUTE}/verify-a-webhook-signature`);
});

test('shows the page title and every article', async ({ page }) => {
  await open(page);
  expect(await page.getByTestId('help-article').count()).toBeGreaterThanOrEqual(10);
  // The articles ship with the app, so nothing here is sample data.
  // (One article is about the label, so match the badge's own exact text, not the words.)
  await expect(page.getByText('Sample data', { exact: true })).toHaveCount(0);
});

test('does not scroll sideways at any size', async ({ page }) => {
  await open(page);
  await expectNoSidewaysScroll(page, SIZES);
  await page.goto(`${ROUTE}/verify-a-webhook-signature`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoSidewaysScroll(page, SIZES);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), 'Phone layout only');
  await open(page);
  await expectTapTargets(page, [
    page.getByRole('searchbox', { name: 'Search help articles' }),
    page.getByRole('link', { name: 'All topics' }),
    page.getByRole('link', { name: 'Billing', exact: true }),
    page.getByTestId('help-article').first(),
  ]);
});

test('wraps long values', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox', { name: 'Search help articles' }).fill('x'.repeat(200));
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test('updates results as you type', async ({ page }) => {
  await open(page);
  const total = await page.getByTestId('help-article').count();
  await page.getByRole('searchbox', { name: 'Search help articles' }).pressSequentially('webhook');
  await expect.poll(() => page.getByTestId('help-article').count()).toBeLessThan(total);
  await expect(page.getByTestId('help-article').first()).toBeVisible();
});

test('finds the webhook signature article', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox', { name: 'Search help articles' }).fill('signature');
  const hit = page.getByTestId('help-article').filter({ hasText: 'Verify a webhook signature' });
  await expect(hit).toBeVisible();
  await hit.getByRole('link').click();
  await expect(page).toHaveURL(/\/support\/help\/verify-a-webhook-signature$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Verify a webhook signature' })).toBeVisible();
  await expect(page.getByText('X-LogiCore-Signature').first()).toBeVisible();
});

test('filters by category through the URL', async ({ page }) => {
  await open(page);
  const total = await page.getByTestId('help-article').count();
  await page.getByRole('link', { name: 'Billing', exact: true }).click();
  await expect(page).toHaveURL(/category=billing/);
  const count = await page.getByTestId('help-article').count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(total);
  await page.getByRole('link', { name: 'All topics' }).click();
  await expect(page.getByTestId('help-article')).toHaveCount(total);
});

test('shows an empty state that offers a ticket', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox', { name: 'Search help articles' }).fill('qqqqzzzz');
  const empty = page.getByTestId('empty-state');
  await expect(empty).toContainText('No articles match');
  await expect(empty.getByRole('link', { name: 'Raise a ticket' })).toHaveAttribute(
    'href',
    '/support/tickets?new=1',
  );
});

test('ignores bad URL input', async ({ page }) => {
  await signIn(page);
  const total = 10;
  for (const query of ['?page=abc', '?page=-1', '?category=FOO', `?q=${'a'.repeat(300)}`]) {
    const response = await page.goto(`${ROUTE}${query}`);
    expect(response?.status(), query).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: 'Help centre' })).toBeVisible();
    if (!query.startsWith('?q=')) {
      expect(await page.getByTestId('help-article').count(), query).toBeGreaterThanOrEqual(total);
    }
  }
});

test('opens a ticket from an article', async ({ page }) => {
  await signIn(page);
  await page.goto(`${ROUTE}/verify-a-webhook-signature`);
  // The tickets screen is not built yet, so this checks the link, not the page it opens.
  await expect(page.getByRole('link', { name: 'Raise a ticket' })).toHaveAttribute(
    'href',
    '/support/tickets?new=1',
  );
});

test('returns not found for an unknown article', async ({ page }) => {
  await signIn(page);
  const response = await page.goto(`${ROUTE}/no-such-article`);
  expect(response?.status()).toBe(404);
});

test('keeps typed search text when a topic is chosen', async ({ page }) => {
  await open(page);
  const box = page.getByRole('searchbox', { name: 'Search help articles' });
  await box.fill('wallet');
  await page.getByRole('link', { name: 'Billing', exact: true }).click();
  await expect(page).toHaveURL(/category=billing/);
  await expect(page).toHaveURL(/q=wallet/);
  await expect(box).toHaveValue('wallet');
  await expect(page.getByTestId('help-article').first()).toContainText('wallet');
});
