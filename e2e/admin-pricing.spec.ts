import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { signInAdmin } from './admin-helpers';

const PRICING = '/admin/pricing';
const isPhone = (testInfo: TestInfo) => testInfo.project.name === 'phone';

async function open(page: Page, path = PRICING) {
  await signInAdmin(page);
  await page.goto(path, { waitUntil: 'networkidle' });
}

const courierSwitch = (page: Page, name: string) => page.getByRole('switch', { name: `${name} on for new bookings` });

// Each project edits its own row and merchant, so the desktop and phone runs never collide.
const OWN: Record<string, { carrier: string; name: string; zone: string; merchant: string; merchantId: string }> = {
  desktop: { carrier: 'ekart', name: 'Ekart', zone: 'C', merchant: 'Neelgiri Teas', merchantId: 'mer_002' },
  phone: { carrier: 'shadowfax', name: 'Shadowfax', zone: 'B', merchant: 'Pixel Gadgets', merchantId: 'mer_005' },
};
const own = (testInfo: TestInfo) => OWN[testInfo.project.name] ?? OWN.desktop!;

test('sends a signed-out visitor to the admin sign-in', async ({ page }) => {
  await page.goto(`${PRICING}?carrier=ekart`);
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('answers 404 for a Pricing page that does not exist', async ({ page }) => {
  await signInAdmin(page);
  const response = await page.goto(`${PRICING}/no-such-page`);
  expect(response?.status()).toBe(404);
});

test.describe('couriers', () => {
  // Turning couriers off changes what every other test sees, so only one test, in one project, does it.
  test('asks before turning a courier off, and never turns off the last one', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo), 'Changes shared courier state; runs once, on desktop');
    test.slow();
    await open(page);

    // Keep on: nothing changes.
    await courierSwitch(page, 'Ekart').click({ force: true });
    await page.getByRole('dialog', { name: 'Turn off Ekart?' }).getByRole('button', { name: 'Keep on' }).click();
    await expect(courierSwitch(page, 'Ekart')).toBeChecked();

    // Turn the others off, leaving one courier on.
    for (const name of ['Delhivery', 'Ekart', 'Blue Dart']) {
      await courierSwitch(page, name).click({ force: true });
      await page.getByRole('dialog', { name: `Turn off ${name}?` }).getByRole('button', { name: 'Turn off' }).click();
      await expect(courierSwitch(page, name)).not.toBeChecked();
    }

    // The last one is refused on the server, with a clear message.
    await courierSwitch(page, 'Shadowfax').click({ force: true });
    await page.getByRole('dialog', { name: 'Turn off Shadowfax?' }).getByRole('button', { name: 'Turn off' }).click();
    await expect(page.locator('[data-carrier="shadowfax"]').getByTestId('courier-error')).toContainText(
      'At least one courier must stay on',
    );
    await expect(courierSwitch(page, 'Shadowfax')).toBeChecked();

    // Turning on needs no confirmation. Put them back.
    for (const name of ['Delhivery', 'Ekart', 'Blue Dart']) {
      await courierSwitch(page, name).click({ force: true });
      await expect(courierSwitch(page, name)).toBeChecked();
    }

    await page.goto('/admin/system?action=Courier+disabled', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('admin-audit-entry').filter({ hasText: 'Ekart turned off' }).first()).toBeVisible();
  });
});

test.describe('rate card', () => {
  test('edits a row after showing old and new, and audits it', async ({ page }, testInfo) => {
    test.slow();
    const mine = own(testInfo);
    await open(page, `${PRICING}?carrier=${mine.carrier}&zone=${mine.zone}`);

    await page.getByRole('button', { name: `Edit ${mine.name} zone ${mine.zone}` }).click();
    const popup = page.getByRole('dialog', { name: `${mine.name}, zone ${mine.zone}` });
    const before = await popup.getByLabel('First 500 g (₹)').inputValue();
    const next = (Number(before) + 1).toFixed(2);
    await popup.getByLabel('First 500 g (₹)').fill(next);
    await popup.getByLabel('COD percent').fill('2.25');
    await popup.getByRole('button', { name: 'Review' }).click();

    const review = popup.getByTestId('rate-review');
    await expect(review).toContainText(`₹${Number(before).toFixed(2)}`);
    await expect(review).toContainText(`₹${next}`);
    await expect(review).toContainText('2.25%');
    await popup.getByRole('button', { name: 'Save prices' }).click();
    await expect(popup.getByTestId('pricing-saved')).toBeVisible();
    await popup.getByRole('button', { name: 'Done' }).click();

    const row = page.getByTestId(isPhone(testInfo) ? 'admin-rate-card-item' : 'admin-rate-row');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(`₹${next}`);
    await expect(row).toContainText('2.25%');

    await page.goto('/admin/system?action=Rate+card+updated', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('admin-audit-entry').filter({ hasText: `${mine.carrier} · zone ${mine.zone}` }).first()).toContainText(
      `₹${next}`,
    );
  });

  test('rejects invalid prices on the server and saves nothing', async ({ page }) => {
    await open(page, `${PRICING}?carrier=delhivery&zone=A`);
    await page.getByRole('button', { name: 'Edit Delhivery zone A' }).click();
    const popup = page.getByRole('dialog', { name: 'Delhivery, zone A' });

    await popup.getByLabel('First 500 g (₹)').fill('0');
    await popup.getByLabel('Each extra 500 g (₹)').fill('10000.01');
    await popup.getByLabel('COD percent').fill('12');
    await popup.getByLabel('COD minimum (₹)').fill('1.234');
    await popup.getByRole('button', { name: 'Review' }).click();

    await expect(popup.getByText('Enter rupees above ₹0 and at most ₹10,000, with up to 2 decimals.')).toHaveCount(2);
    await expect(popup.getByText('Enter a percent from 0 to 10, with up to 2 decimals.')).toBeVisible();
    await expect(popup.getByText('Enter rupees from ₹0 to ₹10,000, with up to 2 decimals.')).toBeVisible();
    await expect(popup.getByTestId('rate-review')).toHaveCount(0);
    await popup.getByRole('button', { name: 'Cancel' }).click();
  });

  test('filters by courier and zone, and ignores unknown filters', async ({ page }, testInfo) => {
    const rowKind = isPhone(testInfo) ? 'admin-rate-card-item' : 'admin-rate-row';
    await open(page, `${PRICING}?carrier=bluedart`);
    await expect(page.getByTestId(rowKind)).toHaveCount(5);

    await page.goto(`${PRICING}?carrier=acme&zone=Q`, { waitUntil: 'networkidle' });
    await expect(page.getByTestId(rowKind)).toHaveCount(25);
    if (isPhone(testInfo)) await expect(page.getByTestId('admin-rate-group')).toHaveCount(5);
  });

  test('explains what each zone means', async ({ page }) => {
    await open(page);
    const zones = page.getByTestId('admin-zones');
    for (const text of ['Within city', 'Within state', 'Metro to metro', 'Rest of India', 'Special or remote']) {
      await expect(zones).toContainText(text);
    }
  });
});

test.describe('custom prices', () => {
  test('adds and removes a custom price, rejecting a bad discount first', async ({ page }, testInfo) => {
    test.slow();
    const mine = own(testInfo);
    await open(page);
    const kind = isPhone(testInfo) ? 'admin-override-card' : 'admin-override-row';
    // A retry on the same server may find the earlier one still there.
    const existing = page.getByTestId(kind).filter({ hasText: mine.merchant });
    if (await existing.count()) {
      await existing.getByRole('button', { name: /^Remove/ }).click();
      await page.getByRole('dialog', { name: 'Remove custom price?' }).getByRole('button', { name: 'Remove' }).click();
      await expect(existing).toHaveCount(0);
    }

    await page.getByRole('button', { name: 'Add custom price' }).click();
    const popup = page.getByRole('dialog', { name: 'Add custom price' });
    await popup.getByRole('button', { name: /Merchant/ }).click();
    await page.getByRole('option', { name: mine.merchant }).click();
    await popup.getByLabel('Discount (%)').fill('75');
    await popup.getByLabel('Reason').fill('E2E test account');
    await popup.getByRole('button', { name: 'Add' }).click();
    await expect(popup.getByText('Enter a discount above 0% and at most 50%, with up to 2 decimals.')).toBeVisible();

    await popup.getByLabel('Discount (%)').fill('7.5');
    await popup.getByRole('button', { name: 'Add' }).click();
    await expect(popup.getByTestId('pricing-saved')).toContainText(`${mine.merchant} now gets 7.5% off.`);
    await popup.getByRole('button', { name: 'Done' }).click();
    const added = page.getByTestId(kind).filter({ hasText: mine.merchant });
    await expect(added).toContainText('7.5% off');

    await added.getByRole('button', { name: /^Remove/ }).click();
    await page.getByRole('dialog', { name: 'Remove custom price?' }).getByRole('button', { name: 'Remove' }).click();
    await expect(added).toHaveCount(0);

    await page.goto('/admin/system?action=Price+override+removed', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('admin-audit-entry').filter({ hasText: mine.merchantId }).first()).toBeVisible();
  });
});

test.describe('layout', () => {
  test('groups the rate card by courier on phones, and shows a table on desktop', async ({ page }, testInfo) => {
    await open(page);
    await expect(page.getByTestId('admin-rate-group').first()).toBeVisible({ visible: isPhone(testInfo) });
    await expect(page.getByTestId('admin-rate-row').first()).toBeVisible({ visible: !isPhone(testInfo) });
  });

  test('gives phone controls a 44px tap target', async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo), 'Phone only');
    await open(page);
    const targets = [
      page.getByTestId('admin-courier').first().locator('label'),
      page.getByRole('button', { name: 'Edit Delhivery zone A' }),
      page.getByRole('button', { name: 'Add custom price' }),
    ];
    for (const target of targets) expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });

  for (const width of [320, 768, 1440]) {
    test(`does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
