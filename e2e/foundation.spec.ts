import { expect, test } from '@playwright/test';
import { openLogin, signIn } from './helpers';

// Evoc Ships light theme (the default when the browser has no dark preference).
const EVOC_PRIMARY = 'rgb(24, 62, 235)';

test('the login screen uses the Evoc Ships shape and type', async ({ page }, testInfo) => {
  await openLogin(page);
  const field = page.getByLabel('Work email');
  const button = page.getByRole('button', { name: 'Send verification code' });
  const height = testInfo.project.name === 'phone' ? '44px' : '36px';

  await expect(field).toHaveCSS('border-radius', '10px');
  await expect(field).toHaveCSS('height', height);
  await expect(button).toHaveCSS('height', height);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', /Plus Jakarta Sans/i);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-weight', '800');
});

test('the login screen uses Evoc Ships colours', async ({ page }) => {
  await openLogin(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', EVOC_PRIMARY);
});

test('signed-in screens use the Evoc Ships shape and type', async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole('button', { name: 'Quick' })).toHaveCSS('border-radius', '10px');
  await expect(page.getByTestId('shipments-card')).toHaveCSS('border-radius', '16px');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', /Plus Jakarta Sans/i);
});

test('signed-in controls are compact on desktop and touch-sized on phones', async ({
  page,
}, testInfo) => {
  await signIn(page);
  const expected = testInfo.project.name === 'phone' ? '44px' : '36px';

  await expect(page.getByRole('button', { name: 'Quick' })).toHaveCSS('height', expected);
});

test('security headers are sent', async ({ request }) => {
  const response = await request.get('/login');

  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['x-powered-by']).toBeUndefined();
});
