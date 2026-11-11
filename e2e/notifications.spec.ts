import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/settings/notifications';

// The sample settings are shared by the desktop and phone runs, which can run at the same time, so
// each project changes a row of its own. Each save sends the whole form, so a save from the other
// project can undo a change. Tests that check what was saved read the state first and retry the whole
// round trip, and never depend on the starting state.
const projectOf = (testInfo: { project: { name: string } }) =>
  testInfo.project.name === 'phone' ? 'phone' : 'desktop';
const OWN_ROW = {
  desktop: { label: 'Out for delivery', event: 'OUT_FOR_DELIVERY' },
  phone: { label: 'RTO initiated', event: 'RTO_INITIATED' },
};
const LABELS = ['Manifested', 'In transit', 'Out for delivery', 'Delivered', 'RTO initiated'];
const CHANNELS = ['SMS', 'Email', 'WhatsApp'];

async function openNotifications(page: Page) {
  await signIn(page);
  await page.goto(ROUTE);
  await expect(page.getByRole('heading', { level: 1, name: 'Buyer notifications' })).toBeVisible();
  await expect(page.getByRole('switch').first()).toBeVisible();
}

const messageBox = (page: Page, label: string) => page.getByLabel(`Message for ${label}`, { exact: true });
const saveButton = (page: Page) => page.getByRole('button', { name: 'Save notifications', exact: true });

test.describe('buyer notifications', () => {
  test('sends signed-out visitors to login', async ({ page }) => {
    await expectSignedOutRedirect(page, ROUTE);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await openNotifications(page);
    await expect(page.getByTestId('notifications-card').getByText('Sample data')).toBeVisible();
  });

  test('opens Buyer Notifications from Settings and marks it in the section list', async ({ page }, testInfo) => {
    await signIn(page);
    await page.goto('/settings');
    await page.getByRole('main').getByRole('link', { name: /^Buyer Notifications/ }).click();
    await expect(page).toHaveURL(/\/settings\/notifications$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Buyer notifications' })).toBeVisible();

    if (testInfo.project.name !== 'phone') {
      const list = page.getByRole('navigation', { name: 'Settings sections' });
      await expect(list.getByRole('link', { name: 'Buyer Notifications' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    } else {
      await expect(page.getByRole('link', { name: 'Back to Settings' })).toHaveAttribute('href', '/settings');
    }
  });

  test('shows a switch for every event and channel', async ({ page }) => {
    await openNotifications(page);
    await expect(page.getByRole('switch')).toHaveCount(15);
    for (const label of LABELS) {
      for (const channel of CHANNELS) {
        await expect(
          page.getByRole('switch', { name: `${label} by ${channel}`, exact: true }),
        ).toBeVisible();
      }
    }
  });

  test('toggles a channel for an event and saves', async ({ page }, testInfo) => {
    const { label } = OWN_ROW[projectOf(testInfo)];
    await openNotifications(page);
    const toggle = page.getByRole('switch', { name: `${label} by WhatsApp`, exact: true });

    await expect(async () => {
      await page.goto(ROUTE);
      await expect(toggle).toBeVisible();
      const before = await toggle.isChecked();

      await toggle.click();
      await expect(toggle).toBeChecked({ checked: !before });
      await saveButton(page).click();
      await expect(
        page.getByRole('status').filter({ hasText: 'Notification settings saved.' }),
      ).toBeVisible();

      await page.reload();
      await expect(toggle).toBeChecked({ checked: !before });
    }).toPass();
  });

  test('toggles a switch from the keyboard', async ({ page }, testInfo) => {
    const { label } = OWN_ROW[projectOf(testInfo)];
    await openNotifications(page);
    const toggle = page.getByRole('switch', { name: `${label} by Email`, exact: true });
    const before = await toggle.isChecked();

    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toBeChecked({ checked: !before });
  });

  test('previews a message with sample values as you type', async ({ page }) => {
    await openNotifications(page);
    const box = messageBox(page, 'Delivered');

    await box.fill('Hi {{buyer_name}}, parcel {{awb}} with {{courier}} from {{store_name}}: {{tracking_link}}');
    const preview = page.getByTestId('preview-DELIVERED');
    await expect(preview).toContainText('Hi Asha Rao, parcel ');
    await expect(preview).not.toContainText('{{');
    await expect(preview).toContainText('https://');
  });

  test('shows a preview as plain text, never as markup', async ({ page }) => {
    await openNotifications(page);
    await messageBox(page, 'Delivered').fill('<b>bold</b> <img src=x onerror="window.__hit=1"> {{awb}}');
    const preview = page.getByTestId('preview-DELIVERED');

    await expect(preview).toContainText('<b>bold</b> <img src=x onerror="window.__hit=1">');
    await expect(preview.locator('b, img')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __hit?: number }).__hit)).toBeUndefined();
  });

  test('lists the allowed variables', async ({ page }) => {
    await openNotifications(page);
    for (const variable of ['{{buyer_name}}', '{{awb}}', '{{courier}}', '{{tracking_link}}', '{{store_name}}']) {
      await expect(page.getByTestId('variables-list').getByText(variable, { exact: true })).toBeVisible();
    }
  });

  test('blocks saving an unknown variable', async ({ page }) => {
    await openNotifications(page);
    await messageBox(page, 'Delivered').fill('Hi {{oops}}, parcel {{awb}} {{buyer}}');

    await expect(page.getByText('Unknown variable: {{oops}}', { exact: true })).toBeVisible();
    await saveButton(page).click();
    await expect(page.getByText('Unknown variable: {{oops}}', { exact: true })).toBeVisible();
    await expect(page.getByText('Notification settings saved.')).toHaveCount(0);
    await expect(messageBox(page, 'Delivered')).toHaveAttribute('aria-invalid', 'true');
  });

  test('refuses an empty message', async ({ page }) => {
    await openNotifications(page);
    await messageBox(page, 'Delivered').fill('   ');
    await saveButton(page).click();
    await expect(page.getByText('Enter a message.', { exact: true })).toBeVisible();
    await expect(page.getByText('Notification settings saved.')).toHaveCount(0);
  });

  test('counts SMS parts at 160 characters', async ({ page }) => {
    await openNotifications(page);
    const box = messageBox(page, 'Delivered');
    const parts = page.getByTestId('parts-DELIVERED');

    await box.fill('a'.repeat(160));
    await expect(parts).toContainText('Sends as 1 message');
    await expect(parts).not.toContainText('Sends as 2 messages');

    await box.fill('a'.repeat(161));
    await expect(parts).toContainText('Sends as 2 messages');
    await expect(parts).toContainText('161 characters');
  });

  test('saves an edited message', async ({ page }, testInfo) => {
    const { label } = OWN_ROW[projectOf(testInfo)];
    const text = `Edited by ${projectOf(testInfo)}: {{buyer_name}}, parcel {{awb}}.`;
    await openNotifications(page);

    await expect(async () => {
      await page.goto(ROUTE);
      await messageBox(page, label).fill(text);
      await saveButton(page).click();
      await expect(page.getByRole('status').filter({ hasText: 'Notification settings saved.' })).toBeVisible();
      await page.reload();
      await expect(messageBox(page, label)).toHaveValue(text);
    }).toPass();
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await openNotifications(page);
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('wraps long values', async ({ page }) => {
    await openNotifications(page);
    await messageBox(page, 'Delivered').fill(`${'W'.repeat(300)} {{awb}} ${'x'.repeat(150)}`);
    await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await openNotifications(page);

    const fields = LABELS.map((label) => messageBox(page, label));
    await expectTapTargets(page, [
      page.getByRole('link', { name: 'Back to Settings' }),
      ...LABELS.flatMap((label) =>
        CHANNELS.map((channel) => page.getByRole('switch', { name: `${label} by ${channel}`, exact: true })),
      ),
      ...fields,
      saveButton(page),
    ]);
    for (const field of fields) {
      const size = await field.evaluate((el) => getComputedStyle(el).fontSize);
      expect(parseFloat(size)).toBeGreaterThanOrEqual(16);
    }
  });
});
