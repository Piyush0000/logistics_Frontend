import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { ROLE_DESCRIPTIONS, ROLES, ROLE_LABELS } from '../src/lib/data/team/types';
import { DEMO_EMAIL, fillDetails, openLogin, signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/settings/users';

// The sample team is shared by the desktop and phone runs, which can run at the same time, and by
// repeats and retries. Every test that changes the team invites a member of its own, with an email
// no other run uses, and only touches that row. The seeded admin is never changed.
const projectOf = (testInfo: TestInfo) => (testInfo.project.name === 'phone' ? 'phone' : 'desktop');
const uniqueEmail = (testInfo: TestInfo, tag: string) =>
  `${tag}-${projectOf(testInfo)}-${testInfo.repeatEachIndex}-${testInfo.retry}-${Date.now()}@example.com`;

const row = (page: Page, email: string): Locator =>
  page.getByTestId('member').filter({ has: page.getByText(email, { exact: true }) }).filter({ visible: true });

async function openUsers(page: Page) {
  await signIn(page);
  await page.goto(ROUTE);
  await expect(page.getByRole('heading', { level: 1, name: 'Users & Roles' })).toBeVisible();
}

async function invite(page: Page, email: string, role: string) {
  await page.getByRole('button', { name: 'Invite user' }).click();
  const dialog = page.getByRole('dialog', { name: 'Invite a teammate' });
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Role').selectOption({ label: role });
  await dialog.getByRole('button', { name: 'Send invite' }).click();
  return dialog;
}

test.describe('users and roles', () => {
  test('sends signed-out visitors to login', async ({ page }) => {
    await expectSignedOutRedirect(page, ROUTE);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await openUsers(page);
    await expect(page.getByTestId('team-card').getByText('Sample data')).toBeVisible();
    await expect(page.getByTestId('roles-card').getByText('Sample data')).toHaveCount(0);
  });

  test('shows each role\'s description', async ({ page }) => {
    await openUsers(page);
    const card = page.getByTestId('roles-card');
    for (const role of ROLES) {
      await expect(card.getByText(ROLE_LABELS[role], { exact: true })).toBeVisible();
      await expect(card.getByText(ROLE_DESCRIPTIONS[role], { exact: true })).toBeVisible();
    }
  });

  test('hides role and remove controls on your own row', async ({ page }) => {
    await openUsers(page);
    const mine = row(page, DEMO_EMAIL);
    await expect(mine).toBeVisible();
    await expect(mine.getByText('You', { exact: true })).toBeVisible();
    await expect(mine.getByRole('combobox')).toHaveCount(0);
    await expect(mine.getByRole('button', { name: /^Remove/ })).toHaveCount(0);

    const other = row(page, 'meera@example.com');
    await expect(other.getByRole('combobox')).toBeVisible();
    await expect(other.getByRole('button', { name: /^Remove/ })).toBeVisible();
  });

  test('invites a teammate', async ({ page }, testInfo) => {
    await openUsers(page);
    const email = uniqueEmail(testInfo, 'invite');
    const dialog = await invite(page, email, 'Finance');

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: `Invite sent to ${email}.` })).toBeVisible();
    const added = row(page, email);
    await expect(added).toBeVisible();
    await expect(added.getByText('Invited', { exact: true })).toBeVisible();
    await expect(added.getByRole('combobox')).toHaveValue('finance');
  });

  test('rejects a duplicate invite', async ({ page }, testInfo) => {
    await openUsers(page);
    const email = uniqueEmail(testInfo, 'dup');
    await invite(page, email, 'Viewer');
    await expect(row(page, email)).toBeVisible();

    const dialog = await invite(page, email.toUpperCase(), 'Viewer');
    await expect(dialog.getByRole('alert')).toHaveText('This email is already on your team.');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('member').filter({ hasText: email })).toHaveCount(1);
  });

  test('rejects a bad email in the invite', async ({ page }) => {
    await openUsers(page);
    const dialog = await invite(page, 'not-an-email', 'Viewer');
    await expect(dialog.getByText('Enter a valid email address.')).toBeVisible();
  });

  test('changes a role', async ({ page }, testInfo) => {
    await openUsers(page);
    const email = uniqueEmail(testInfo, 'role');
    await invite(page, email, 'Viewer');
    const target = row(page, email);

    await target.getByRole('combobox').selectOption({ label: 'Operations' });
    await expect(page.getByRole('status').filter({ hasText: `${email} is now Operations.` })).toBeVisible();

    await page.reload();
    await expect(row(page, email).getByRole('combobox')).toHaveValue('operations');
  });

  test('asks before removing and keeps the member on cancel', async ({ page }, testInfo) => {
    await openUsers(page);
    const email = uniqueEmail(testInfo, 'cancel');
    await invite(page, email, 'Viewer');

    await row(page, email).getByRole('button', { name: `Remove ${email}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Remove this teammate?' });
    await expect(dialog.getByText(email, { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Keep member' }).click();

    await expect(dialog).toBeHidden();
    await expect(row(page, email)).toBeVisible();
  });

  test('removes a member after confirming', async ({ page }, testInfo) => {
    await openUsers(page);
    const email = uniqueEmail(testInfo, 'remove');
    await invite(page, email, 'Viewer');

    await row(page, email).getByRole('button', { name: `Remove ${email}` }).click();
    await page.getByRole('dialog', { name: 'Remove this teammate?' }).getByRole('button', { name: 'Remove member' }).click();

    await expect(page.getByRole('status').filter({ hasText: `${email} was removed.` })).toBeVisible();
    await expect(page.getByTestId('member').filter({ hasText: email })).toHaveCount(0);
  });

  test('blocks removing the last admin', async ({ page }, testInfo) => {
    // Sign in as someone else, so the only admin is another row and has controls.
    await openLogin(page);
    await page.getByRole('tab', { name: 'Email + Password' }).click();
    await fillDetails(page, `viewer-${projectOf(testInfo)}@example.com`);
    await page.locator('input[name="password"]').fill('demo-password');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto(ROUTE);

    const admin = row(page, DEMO_EMAIL);
    await admin.getByRole('combobox').selectOption({ label: 'Viewer' });
    await expect(page.getByRole('alert').filter({ hasText: 'At least one admin must remain.' })).toBeVisible();
    await expect(admin.getByRole('combobox')).toHaveValue('admin');

    await admin.getByRole('button', { name: `Remove ${DEMO_EMAIL}` }).click();
    await page.getByRole('dialog', { name: 'Remove this teammate?' }).getByRole('button', { name: 'Remove member' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'At least one admin must remain.' })).toBeVisible();
    await expect(row(page, DEMO_EMAIL)).toBeVisible();
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await openUsers(page);
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('wraps long values', async ({ page }, testInfo) => {
    await openUsers(page);
    const long = `${'l'.repeat(40)}-${projectOf(testInfo)}-${testInfo.repeatEachIndex}-${testInfo.retry}@${'b'.repeat(40)}.example.com`;
    await invite(page, long, 'Viewer');
    await expect(row(page, long)).toBeVisible();
    await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await openUsers(page);
    await expectTapTargets(page, [
      page.getByRole('link', { name: 'Back to Settings' }),
      page.getByRole('button', { name: 'Invite user' }),
      row(page, 'meera@example.com').getByRole('combobox'),
      row(page, 'meera@example.com').getByRole('button', { name: /^Remove/ }),
    ]);
  });

  test('shows the section list on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop layout only');
    await openUsers(page);
    const list = page.getByRole('navigation', { name: 'Settings sections' });
    await expect(list.getByRole('link', { name: 'Users & Roles' })).toHaveAttribute('aria-current', 'page');
  });
});
