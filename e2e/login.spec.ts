import { expect, test, type Page } from '@playwright/test';
import { DEMO_CODE, DEMO_EMAIL, fillDetails, openLogin, signIn } from './helpers';

const sendCode = { name: 'Send verification code' };

test.describe('details step', () => {
  test.beforeEach(async ({ page }) => {
    await openLogin(page);
  });

  test('starts on Email OTP with the submit button disabled', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sign in to your workspace');
    await expect(page.getByRole('tab', { name: 'Email OTP' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', sendCode)).toBeDisabled();
  });

  test('says plainly that this is a demo', async ({ page }) => {
    await expect(page.getByText('Demo sign-in: no email is sent')).toBeVisible();
  });

  test('needs both a valid email and the terms to enable submit', async ({ page }) => {
    await page.getByLabel('Work email').fill(DEMO_EMAIL);
    await expect(page.getByRole('button', sendCode)).toBeDisabled();

    await page.getByRole('checkbox').check();
    await expect(page.getByRole('button', sendCode)).toBeEnabled();

    await page.getByLabel('Work email').fill('not-an-email');
    await expect(page.getByRole('button', sendCode)).toBeDisabled();
  });

  test('shows an error for an invalid email after leaving the field', async ({ page }) => {
    await page.getByLabel('Work email').fill('not-an-email');
    await page.getByLabel('Work email').blur();

    await expect(page.getByText('Enter a valid work email.')).toBeVisible();
    await expect(page.getByLabel('Work email')).toHaveAttribute('aria-invalid', 'true');
  });

  test('keeps the email and terms when switching tabs', async ({ page }) => {
    await fillDetails(page);
    await page.getByRole('tab', { name: 'Email + Password' }).click();

    await expect(page.getByLabel('Work email')).toHaveValue(DEMO_EMAIL);
    await expect(page.getByRole('checkbox')).toBeChecked();
  });

  test('moves between tabs with the arrow keys', async ({ page }) => {
    await page.getByRole('tab', { name: 'Email OTP' }).focus();
    await page.keyboard.press('ArrowRight');

    const passwordTab = page.getByRole('tab', { name: 'Email + Password' });
    await expect(passwordTab).toHaveAttribute('aria-selected', 'true');
    await expect(passwordTab).toBeFocused();
  });

  test('opens the terms placeholder', async ({ page, context }) => {
    const [terms] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: 'View terms and policies' }).click(),
    ]);

    await expect(terms.getByRole('heading', { level: 1 })).toHaveText('Terms and policies');
  });

  test('does not show the reference brand', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText(/mera|courier ?wala|sharkship/i);
  });
});

test('keeps details entered before the page finishes loading', async ({ page }) => {
  let release = () => {};
  const scriptsHeld = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/_next/static/**/*.js', async (route) => {
    await scriptsHeld;
    await route.continue();
  });

  await page.goto('/login', { waitUntil: 'commit' });
  await fillDetails(page);
  release();

  await expect(page.getByRole('button', sendCode)).toBeEnabled();
});

test.describe('Email OTP', () => {
  test.beforeEach(async ({ page }) => {
    await openLogin(page);
    await fillDetails(page);
    await page.getByRole('button', sendCode).click();
    await expect(page.getByLabel('Verification code')).toBeVisible();
  });

  test('shows the labelled demo code and the email', async ({ page }) => {
    await expect(page.getByText(`No email was sent. Use demo code ${DEMO_CODE}.`)).toBeVisible();
    await expect(page.getByText(DEMO_EMAIL)).toBeVisible();
  });

  test('puts the cursor in the code field', async ({ page }) => {
    await expect(page.getByLabel('Verification code')).toBeFocused();
  });

  test('uses the phone keypad and one-time-code autofill', async ({ page }) => {
    const code = page.getByLabel('Verification code');

    await expect(code).toHaveAttribute('inputmode', 'numeric');
    await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
  });

  test('keeps verify disabled until six digits are entered', async ({ page }) => {
    await page.getByLabel('Verification code').fill('123');

    await expect(page.getByRole('button', { name: 'Verify and sign in' })).toBeDisabled();
  });

  test('explains a wrong code and stays on the step', async ({ page }) => {
    await page.getByLabel('Verification code').fill('000000');
    await page.getByRole('button', { name: 'Verify and sign in' }).click();

    await expect(page.getByRole('main').getByRole('alert')).toHaveText('That code is incorrect. Check it and try again.');
    await expect(page.getByLabel('Verification code')).toBeVisible();
  });

  test('signs in with the demo code', async ({ page }) => {
    await page.getByLabel('Verification code').fill(DEMO_CODE);
    await page.getByRole('button', { name: 'Verify and sign in' }).click();

    await page.waitForURL('**/dashboard');
    await page.getByRole('button', { name: 'Account menu' }).click();
    await expect(page.getByText(`Signed in as ${DEMO_EMAIL}`)).toBeVisible();
  });

  test('confirms when a new code is requested', async ({ page }) => {
    await page.getByRole('button', { name: 'Resend code' }).click();

    await expect(page.getByRole('status')).toHaveText('New demo code ready.');
  });

  test('goes back with the details kept', async ({ page }) => {
    await page.getByRole('button', { name: 'Back' }).click();

    await expect(page.getByLabel('Work email')).toHaveValue(DEMO_EMAIL);
    await expect(page.getByRole('checkbox')).toBeChecked();
  });
});

test.describe('Email + Password', () => {
  test.beforeEach(async ({ page }) => {
    await openLogin(page);
    await page.getByRole('tab', { name: 'Email + Password' }).click();
    await fillDetails(page);
  });

  test('needs a password to enable submit', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  });

  test('keeps the terms ticked and the fields filled after a failed sign-in', async ({ page }) => {
    await page.locator('input[name="password"]').fill('short');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('main').getByRole('alert').waitFor();

    await expect(page.getByRole('checkbox')).toBeChecked();
    await expect(page.getByLabel('Work email')).toHaveValue('ops@example.com');
    await expect(page.locator('input[name="password"]')).toHaveValue('short');
  });

  test('puts the password straight after the email', async ({ page }) => {
    const password = await page.locator('input[name="password"]').boundingBox();
    const terms = await page.getByRole('checkbox').boundingBox();

    expect(password?.y ?? Infinity).toBeLessThan(terms?.y ?? 0);
  });

  test('explains a short password', async ({ page }) => {
    await page.locator('input[name="password"]').fill('short');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Use at least 8 characters.');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('shows and hides the password', async ({ page }) => {
    const password = page.locator('input[name="password"]');
    await password.fill('demo-password');

    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('signs in with a valid password', async ({ page }) => {
    await page.locator('input[name="password"]').fill('demo-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();

    await page.waitForURL('**/dashboard');
  });
});

test.describe('session', () => {
  test('stores the session in a cookie scripts cannot read', async ({ page, context }) => {
    await signIn(page);

    const cookie = (await context.cookies()).find(({ name }) => name === 'evoc_demo_session');

    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(await page.evaluate(() => document.cookie)).not.toContain('evoc_demo_session');
  });

  test('never sets the real session cookie', async ({ page, context }) => {
    await signIn(page);

    expect((await context.cookies()).map(({ name }) => name)).not.toContain('evoc_session');
  });

  test('sends signed-out visitors to login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('sends signed-in visitors past login', async ({ page }) => {
    await signIn(page);

    await page.goto('/login');

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('sends the home page to login when signed out', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
  });

  test('signs out', async ({ page }) => {
    await signIn(page);

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('menu').getByRole('button', { name: 'Sign out' }).click();

    await page.waitForURL('**/login');
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('phone balance', () => {
  async function expectBalanced(page: Page) {
    const section = await page.getByTestId('login-section').boundingBox();
    const content = await page.getByTestId('login-content').boundingBox();
    if (!section || !content) throw new Error('Login layout not found');

    const above = content.y - section.y;
    const below = section.y + section.height - (content.y + content.height);

    expect(Math.abs(above - below)).toBeLessThanOrEqual(2);
  }

  for (const [width, height] of [
    [360, 800],
    [390, 844],
    [412, 915],
  ] as const) {
    test.describe(`at ${width}x${height}`, () => {
      test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
        await page.setViewportSize({ width, height });
        await openLogin(page);
      });

      test('fills the screen with the header and a centred form', async ({ page }) => {
        const panel = await page.getByTestId('brand-panel').boundingBox();

        expect(panel?.height ?? 0).toBeGreaterThanOrEqual(height * 0.28);
        await expectBalanced(page);
      });

      test('stays centred on the password tab', async ({ page }) => {
        await page.getByRole('tab', { name: 'Email + Password' }).click();

        await expectBalanced(page);
      });

      test('stays centred on the code step', async ({ page }) => {
        await fillDetails(page);
        await page.getByRole('button', sendCode).click();
        await page.getByLabel('Verification code').waitFor();

        await expectBalanced(page);
      });
    });
  }

  test('centres the heading on phones and keeps it left on desktop', async ({ page }, testInfo) => {
    await openLogin(page);
    const expected = testInfo.project.name === 'phone' ? 'center' : 'start';

    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('text-align', expected);
  });

  test('keeps form labels left-aligned on phones', async ({ page }) => {
    await openLogin(page);

    await expect(page.getByText('Work email')).toHaveCSS('text-align', 'left');
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
      await openLogin(page);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );

      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test('shows the feature points only when there is room', async ({ page }, testInfo) => {
    await openLogin(page);
    const points = page.getByText('Orders and tracking');

    if (testInfo.project.name === 'phone') await expect(points).toBeHidden();
    else await expect(points).toBeVisible();
  });

  test('puts the phone form near the top of the screen', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await openLogin(page);

    const box = await page.getByLabel('Work email').boundingBox();
    const viewport = page.viewportSize();

    expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThan(viewport?.height ?? 0);
  });

  test('keeps every tap target at least 44px tall on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await openLogin(page);

    for (const target of [
      page.getByRole('tab', { name: 'Email OTP' }),
      page.getByLabel('Work email'),
      page.getByRole('button', sendCode),
      page.getByRole('link', { name: 'View terms and policies' }),
    ]) {
      expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
