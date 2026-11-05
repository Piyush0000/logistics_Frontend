import { expect, test } from '@playwright/test';
import { openLogin, signIn } from './helpers';

const SHARKSHIP_PRIMARY = 'rgb(24, 79, 162)';

test('the login screen uses the Mera Courier Wala shape and type', async ({ page }) => {
  await openLogin(page);
  const field = page.getByLabel('Work email');
  const button = page.getByRole('button', { name: 'Send verification code' });

  await expect(field).toHaveCSS('border-radius', '14px');
  await expect(field).toHaveCSS('height', '48px');
  await expect(button).toHaveCSS('height', '48px');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', /Manrope/i);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-weight', '800');
});

test('the login screen uses Sharkship colours', async ({ page }) => {
  await openLogin(page);

  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', SHARKSHIP_PRIMARY);
  await expect(page.getByTestId('brand-panel')).toHaveCSS('background-color', SHARKSHIP_PRIMARY);
});

test('signed-in screens use the Sharkship shape, type and colours', async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole('button', { name: 'Quick' })).toHaveCSS('border-radius', '8px');
  await expect(page.getByTestId('wallet')).toHaveCSS('background-color', SHARKSHIP_PRIMARY);
  await expect(page.getByTestId('shipments-card')).toHaveCSS('border-radius', '16px');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-family', /IBM Plex Sans/i);
});

test('signed-in controls are compact on desktop and touch-sized on phones', async ({
  page,
}, testInfo) => {
  await signIn(page);
  const expected = testInfo.project.name === 'phone' ? '44px' : '32px';

  await expect(page.getByRole('button', { name: 'Quick' })).toHaveCSS('height', expected);
});

test('security headers are sent', async ({ request }) => {
  const response = await request.get('/login');

  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['x-powered-by']).toBeUndefined();
});
