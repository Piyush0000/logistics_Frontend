import { expect, test } from '@playwright/test';
import { e2eUrl, signIn } from './helpers';
import { expectNoSidewaysScroll, expectTapTargets, SIZES } from './screen-checks';

const ERROR_ROUTE = '/e2e-error-test';
const isPhone = (testInfo: { project: { name: string } }) => testInfo.project.name === 'phone';

test('shows the not-found page for an unknown route', async ({ page }) => {
  const response = await page.goto('/no-such-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/home');
  await expect(page.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/dashboard');
});

test('shows the not-found page inside the app for an unknown shipment', async ({ page }) => {
  await signIn(page);
  const response = await page.goto('/orders/NO-SUCH-AWB');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
});

test('not-found page does not scroll sideways and has touch-sized links', async ({ page }, testInfo) => {
  await page.goto('/no-such-page');
  await expectNoSidewaysScroll(page, SIZES);
  if (isPhone(testInfo)) {
    await expectTapTargets(page, [
      page.getByRole('link', { name: 'Go to Home' }),
      page.getByRole('link', { name: 'Go to Dashboard' }),
    ]);
  }
});

test('recovers from a page error', async ({ page, context }) => {
  await signIn(page);
  await page.goto(ERROR_ROUTE);
  await expect(page.getByRole('heading', { level: 1, name: 'Something went wrong on this page.' })).toBeVisible();
  // No technical detail reaches the merchant.
  await expect(page.getByText(/e2e error route|digest|stack/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/home');

  // The test route stops throwing once this cookie exists, so Try again can really recover.
  await context.addCookies([{ name: 'e2e-error-recovered', value: '1', url: e2eUrl(3101) }]);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Recovered' })).toBeVisible();
});

test('keeps the shell on app errors', async ({ page }, testInfo) => {
  await signIn(page);
  await page.goto(ERROR_ROUTE);
  await expect(page.getByRole('heading', { level: 1, name: 'Something went wrong on this page.' })).toBeVisible();
  if (isPhone(testInfo)) {
    await expect(page.getByRole('button', { name: /menu/i }).first()).toBeVisible();
  } else {
    await expect(page.getByRole('navigation').first()).toBeVisible();
  }
  await expect(page.getByTestId('wallet')).toBeVisible();
});

test('error page does not scroll sideways and has touch-sized controls', async ({ page }, testInfo) => {
  await signIn(page);
  await page.goto(ERROR_ROUTE);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expectNoSidewaysScroll(page, SIZES);
  if (isPhone(testInfo)) {
    await expectTapTargets(page, [
      page.getByRole('button', { name: 'Try again' }),
      page.getByRole('link', { name: 'Go to Home' }),
    ]);
  }
});

test('the error test route is a 404 on servers without E2E_ERROR_ROUTE', async ({ request }) => {
  // Port 3104 is a production build that never sets E2E_ERROR_ROUTE.
  const response = await request.get(e2eUrl(3104) + ERROR_ROUTE);
  expect(response.status()).toBe(404);
});
