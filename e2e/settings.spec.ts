import { expect, test, type Page } from '@playwright/test';
import { SETTINGS_SECTIONS } from '../src/app/(app)/settings/settings-nav';
import { DEMO_EMAIL, fillDetails, openLogin, signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const HUB = '/settings';
const PROFILE = '/settings/profile';

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main' });

// The sample profile is shared by the desktop and phone runs, which can run at the same time, so each
// project saves values of its own and no test depends on what the other one saved.
const projectOf = (testInfo: { project: { name: string } }) =>
  testInfo.project.name === 'phone' ? 'phone' : 'desktop';
const nameFor = (project: string) => `Asha ${project}`;

async function openHub(page: Page) {
  await signIn(page);
  await page.goto(HUB);
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
}

async function openProfile(page: Page) {
  await signIn(page);
  await page.goto(PROFILE);
  await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();
}

async function openSidebar(page: Page, isPhone: boolean) {
  await page.getByRole('button', { name: isPhone ? 'Open menu' : 'Expand sidebar' }).click();
}

test.describe('settings hub', () => {
  test('sends signed-out visitors to login', async ({ page }) => {
    await expectSignedOutRedirect(page, HUB);
  });

  test('lists every settings section', async ({ page }) => {
    await openHub(page);
    const main = page.getByRole('main');

    for (const section of SETTINGS_SECTIONS) {
      await expect(main.getByRole('heading', { level: 2, name: section.label, exact: true })).toBeVisible();
      await expect(main.getByText(section.description, { exact: true })).toBeVisible();
      const link = main.getByRole('link', { name: new RegExp(`^${section.label}`) });
      if (section.status === 'live') {
        await expect(link).toHaveAttribute('href', section.href);
      } else {
        await expect(link).toHaveCount(0);
        await expect(main.getByTestId(`section-${section.href}`)).toHaveAttribute('aria-disabled', 'true');
        await expect(main.getByTestId(`section-${section.href}`)).toHaveAttribute(
          'title',
          `${section.label} is not available yet`,
        );
      }
    }
  });

  test('opens Profile from Settings', async ({ page }) => {
    await openHub(page);
    await page.getByRole('main').getByRole('link', { name: /^Profile/ }).click();
    await expect(page).toHaveURL(/\/settings\/profile$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();
  });

  test('opens Channel Integrations from Settings', async ({ page }) => {
    await openHub(page);
    await page
      .getByRole('main')
      .getByRole('link', { name: /API Keys & Channel Integrations/ })
      .click();
    await expect(page).toHaveURL(/\/channel-integrations$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Channel Integrations' })).toBeVisible();
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await openHub(page);
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await openHub(page);
    await expectTapTargets(page, [
      page.getByRole('main').getByRole('link', { name: /^Profile/ }),
      page.getByRole('main').getByRole('link', { name: /API Keys & Channel Integrations/ }),
    ]);
  });
});

test.describe('sidebar', () => {
  for (const path of [HUB, PROFILE, '/channel-integrations']) {
    test(`marks Settings active in the sidebar on ${
      path === '/channel-integrations' ? 'Channel Integrations' : path
    }`, async ({ page }, testInfo) => {
      await signIn(page);
      await page.goto(path);
      await openSidebar(page, testInfo.project.name === 'phone');

      await expect(nav(page).getByRole('link', { name: 'Settings', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(nav(page).getByRole('link', { name: 'Dashboard', exact: true })).not.toHaveAttribute(
        'aria-current',
        'page',
      );
    });
  }

  test('opens Profile from View Profile', async ({ page }, testInfo) => {
    await signIn(page);
    await openSidebar(page, testInfo.project.name === 'phone');
    await page.getByTestId('sidebar-user').getByRole('link', { name: 'View Profile' }).click();
    await expect(page).toHaveURL(/\/settings\/profile$/);
  });
});

test.describe('profile', () => {
  test('sends signed-out visitors to login', async ({ page }) => {
    await expectSignedOutRedirect(page, PROFILE);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await openProfile(page);
    await expect(page.getByTestId('profile-card').getByText('Sample data')).toBeVisible();
    await expect(page.getByTestId('password-card').getByText('Sample data')).toBeVisible();
  });

  test('shows the section list on desktop and a back link on phones', async ({ page }, testInfo) => {
    await openProfile(page);
    const list = page.getByRole('navigation', { name: 'Settings sections' });
    const back = page.getByRole('link', { name: 'Back to Settings' });

    if (testInfo.project.name === 'phone') {
      await expect(back).toBeVisible();
      await expect(back).toHaveAttribute('href', '/settings');
      await expect(list).toBeHidden();
    } else {
      await expect(back).toBeHidden();
      await expect(list.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
      await expect(list.getByRole('link', { name: 'API Keys & Channel Integrations' })).toHaveAttribute(
        'href',
        '/channel-integrations',
      );
      await expect(list.getByRole('link', { name: 'Company & KYC' })).toHaveAttribute('href', '/settings/company');
      // Whichever section is still planned shows as a disabled button; none left means all are live.
      const planned = SETTINGS_SECTIONS.find((section) => section.status === 'planned');
      if (planned) {
        const button = list.getByRole('button', { name: planned.label, exact: true });
        await expect(button).toBeDisabled();
        await expect(button).toHaveAttribute('title', `${planned.label} is not available yet`);
      } else {
        await expect(list.getByRole('button')).toHaveCount(0);
      }
    }
  });

  test('shows the session email read-only', async ({ page }) => {
    await openProfile(page);
    const email = page.getByLabel('Email');

    await expect(email).toHaveValue(DEMO_EMAIL);
    await expect(email).toHaveAttribute('readonly', '');
    await expect(page.getByText(/sign-in email/i)).toBeVisible();
  });

  test('saves the profile', async ({ page }, testInfo) => {
    await openProfile(page);
    const name = nameFor(projectOf(testInfo));

    await page.getByLabel('Full name').fill(name);
    await page.getByLabel('Phone').fill('+919811111111');
    await page.getByRole('button', { name: 'Save profile' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Profile saved.' })).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveValue(DEMO_EMAIL);

    // The other project may save at the same time, so the name is one of the two saved ones.
    await expect(async () => {
      await page.reload();
      await expect(page.getByLabel('Full name')).toHaveValue(/^Asha (desktop|phone)$/);
    }).toPass();
  });

  test('rejects a bad name and phone', async ({ page }) => {
    await openProfile(page);

    await page.getByLabel('Full name').fill('   ');
    await page.getByLabel('Phone').fill('12345');
    await page.getByRole('button', { name: 'Save profile' }).click();

    await expect(page.getByText('Enter your name.')).toBeVisible();
    await expect(page.getByText('Enter 10 to 15 digits, with an optional + at the start.')).toBeVisible();
    await expect(page.getByText('Profile saved.')).toHaveCount(0);
  });

  test('limits the name to 80 characters', async ({ page }) => {
    await openProfile(page);

    await page.getByLabel('Full name').fill('n'.repeat(81));
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.getByText('Name must be at most 80 characters.')).toBeVisible();
  });

  test('rejects a mismatched password confirmation', async ({ page }) => {
    await openProfile(page);

    await page.getByLabel('Current password').fill('old-password');
    await page.getByLabel('New password', { exact: true }).fill('new-password');
    await page.getByLabel('Confirm new password').fill('another-password');
    await page.getByRole('button', { name: 'Change password' }).click();

    await expect(page.getByText('The passwords do not match.')).toBeVisible();
    await expect(page.getByText('Password changed.')).toHaveCount(0);
  });

  test('rejects a short password and an unchanged one', async ({ page }) => {
    await openProfile(page);
    const current = page.getByLabel('Current password');
    const next = page.getByLabel('New password', { exact: true });
    const confirm = page.getByLabel('Confirm new password');
    const submit = page.getByRole('button', { name: 'Change password' });

    await current.fill('old-password');
    await next.fill('short');
    await confirm.fill('short');
    await submit.click();
    await expect(page.getByText('Use at least 8 characters.')).toBeVisible();

    await next.fill('old-password');
    await confirm.fill('old-password');
    await submit.click();
    await expect(page.getByText('Choose a password different from the current one.')).toBeVisible();
  });

  test('changes the password and clears the boxes', async ({ page }) => {
    await openProfile(page);
    const current = page.getByLabel('Current password');

    await current.fill('old-password');
    await page.getByLabel('New password', { exact: true }).fill('new-password');
    await page.getByLabel('Confirm new password').fill('new-password');
    await page.getByRole('button', { name: 'Change password' }).click();

    await expect(page.getByRole('status').filter({ hasText: 'Password changed.' })).toBeVisible();
    await expect(current).toHaveValue('');
    await expect(page.getByLabel('Confirm new password')).toHaveValue('');
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await openProfile(page);
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('wraps long values', async ({ page }) => {
    const longEmail = `${'a'.repeat(50)}@${'b'.repeat(40)}.example.com`;
    await openLogin(page);
    await page.getByRole('tab', { name: 'Email + Password' }).click();
    await fillDetails(page, longEmail);
    await page.locator('input[name="password"]').fill('demo-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto(PROFILE);
    await expect(page.getByLabel('Email')).toHaveValue(longEmail);

    await page.getByLabel('Full name').fill('W'.repeat(80));
    await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await openProfile(page);

    const fields = [
      page.getByLabel('Full name'),
      page.getByLabel('Email'),
      page.getByLabel('Phone'),
      page.getByLabel('Current password'),
      page.getByLabel('New password', { exact: true }),
      page.getByLabel('Confirm new password'),
    ];
    await expectTapTargets(page, [
      page.getByRole('link', { name: 'Back to Settings' }),
      ...fields,
      page.getByRole('button', { name: 'Save profile' }),
      page.getByRole('button', { name: 'Change password' }),
    ]);
    for (const field of fields) {
      const size = await field.evaluate((el) => getComputedStyle(el).fontSize);
      expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
    }
  });
});
