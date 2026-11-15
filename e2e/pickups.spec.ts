import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const PICKUPS = '/orders/pickups';
const ONE_COURIER = 'Select shipments from one courier per pickup.';

// The sample shipments ready to ship: Blue Dart and two Ekart ones.
const BLUEDART = 'DEMOBD005';
const EKART = 'DEMOEK009';

function pickupRows(page: Page, projectName: string) {
  return projectName === 'phone' ? page.getByTestId('pickup-item') : page.getByTestId('pickup-row');
}

function readyRows(page: Page, projectName: string) {
  return projectName === 'phone' ? page.getByTestId('ready-item') : page.getByTestId('ready-row');
}

async function open(page: Page, route = PICKUPS) {
  await signIn(page);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: 'Pickups & Manifests' })).toBeVisible();
}

function dialog(page: Page) {
  return page.getByRole('dialog', { name: 'Schedule pickup' });
}

function select(page: Page, awb: string) {
  return page.getByRole('checkbox', { name: `Select ${awb}` });
}

/** A day in Indian time, `offset` days from today, as YYYY-MM-DD. */
function indianDay(offset: number): string {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, PICKUPS);
  await expectSignedOutRedirect(page, `${PICKUPS}/manifest-print/pk-001`);
});

test('wraps long values', async ({ page }) => {
  await open(page);
  // The first sample pickup has a long address label; its manifest has a 20-character AWB.
  // The table and the cards are both in the page, so look at the one that shows.
  await expect(page.getByText('Bhubaneswar regional distribution hub').locator('visible=true').first()).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  await page.goto(`${PICKUPS}/manifest-print/pk-001`);
  await expect(page.getByText('DEMOVERYLONGAWB00001')).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test.describe('pickups', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pickups & Manifests');
    await expect(page.getByTestId('ready-card').getByText('Sample data')).toBeVisible();
    await expect(page.getByTestId('pickups-card').getByText('Sample data')).toBeVisible();
  });

  test('lists manifested shipments to ship and scheduled pickups', async ({ page }, testInfo) => {
    const project = testInfo.project.name;
    await expect(readyRows(page, project).filter({ hasText: BLUEDART })).toBeVisible();
    await expect(readyRows(page, project).filter({ hasText: EKART })).toBeVisible();
    await expect(pickupRows(page, project)).toHaveCount(10);
    // Scheduling tests add pickups at the top, so find the first sample pickup by its address.
    const sample = pickupRows(page, project).filter({ hasText: 'Bhubaneswar regional' });
    await expect(sample).toHaveCount(1);
    await expect(sample).toContainText('3 shipments');
  });

  test('shows every column on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop table');
    for (const name of ['Date', 'Window', 'Courier', 'Address', 'Shipments', 'Status', 'Manifest']) {
      await expect(page.getByTestId('pickups-card').getByRole('columnheader', { name })).toBeVisible();
    }
  });

  test('pages through pickups', async ({ page }, testInfo) => {
    await page.getByRole('link', { name: 'Next page' }).click();
    await page.waitForURL('**page=2');
    expect(await pickupRows(page, testInfo.project.name).count()).toBeGreaterThanOrEqual(3);
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
  });

  test('ignores bad URL input', async ({ page }, testInfo) => {
    for (const query of ['?page=abc', '?page=-1', '?page=999', `?q=${'q'.repeat(300)}`, '?status=FOO']) {
      const response = await page.goto(`${PICKUPS}${query}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name: 'Pickups & Manifests' })).toBeVisible();
      await expect(pickupRows(page, testInfo.project.name).first()).toBeVisible();
      await expect(page.getByText('Could not reach')).toHaveCount(0);
    }
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone check');
    await select(page, BLUEDART).check();
    await expectTapTargets(page, [
      page.getByRole('button', { name: 'Schedule pickup' }),
      readyRows(page, 'phone').first(),
      pickupRows(page, 'phone').first().getByRole('link', { name: 'Print manifest' }),
      page.getByRole('link', { name: 'Next page' }),
    ]);
    await page.getByRole('button', { name: 'Schedule pickup' }).click();
    const form = dialog(page);
    await expectTapTargets(page, [
      form.getByRole('button', { name: /Pickup date/ }),
      form.getByLabel('Window start'),
      form.getByLabel('Window end'),
      form.getByRole('button', { name: /Pickup address/ }),
      form.getByRole('button', { name: 'Confirm pickup' }),
    ]);
  });
});

test.describe('scheduling', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('needs a shipment before a pickup can be scheduled', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Schedule pickup' })).toBeDisabled();
    await select(page, BLUEDART).check();
    await expect(page.getByRole('button', { name: 'Schedule pickup' })).toBeEnabled();
    await expect(page.getByText('1 selected')).toBeVisible();
  });

  test('selects every shipment at once', async ({ page }) => {
    await page.getByRole('checkbox', { name: 'Select all shipments' }).check();
    await expect(select(page, BLUEDART)).toBeChecked();
    await expect(select(page, EKART)).toBeChecked();
    await page.getByRole('checkbox', { name: 'Select all shipments' }).uncheck();
    await expect(select(page, BLUEDART)).not.toBeChecked();
  });

  test('rejects shipments from two couriers in one pickup', async ({ page }) => {
    await select(page, BLUEDART).check();
    await select(page, EKART).check();
    await page.getByRole('button', { name: 'Schedule pickup' }).click();

    await expect(page.getByRole('alert').filter({ hasText: ONE_COURIER })).toBeVisible();
    await expect(dialog(page)).toBeHidden();

    // Taking one away clears the message, and the pickup can go ahead.
    await select(page, BLUEDART).uncheck();
    await expect(page.getByText(ONE_COURIER)).toBeHidden();
    await page.getByRole('button', { name: 'Schedule pickup' }).click();
    await expect(dialog(page)).toBeVisible();
  });

  test('rejects a date more than 7 days ahead', async ({ page }) => {
    await select(page, BLUEDART).check();
    await page.getByRole('button', { name: 'Schedule pickup' }).click();
    const form = dialog(page);

    await form.getByRole('button', { name: /Pickup date/ }).click();
    const tooFar = indianDay(8);
    const day = form.locator(`[data-day="${tooFar}"]`);
    for (let step = 0; step < 2 && (await day.count()) === 0; step += 1) {
      await form.getByRole('button', { name: 'Next month' }).click();
    }
    await day.click();
    await form.getByRole('button', { name: 'Confirm pickup' }).click();

    await expect(form.getByRole('alert')).toHaveText('Pickup date must be from today to 7 days ahead.');
    await expect(form).toBeVisible();
  });

  test('refuses a window that ends before it starts', async ({ page }) => {
    await select(page, BLUEDART).check();
    await page.getByRole('button', { name: 'Schedule pickup' }).click();
    const form = dialog(page);

    await form.getByLabel('Window start').fill('14:00');
    await form.getByLabel('Window end').fill('10:00');
    await form.getByRole('button', { name: 'Confirm pickup' }).click();
    await expect(form.getByRole('alert')).toHaveText('The window must end after it starts.');

    await form.getByLabel('Window end').fill('');
    await form.getByRole('button', { name: 'Confirm pickup' }).click();
    await expect(form.getByRole('alert')).toHaveText(
      'Enter both the start and end time, or leave both empty.',
    );
  });

  test('schedules a pickup and lists it', async ({ page }, testInfo) => {
    // Desktop and phone runs (and --repeat-each and retries) share one sample store, so each run
    // uses its own window to find its row: desktop starts before 06:00, phone from 06:00.
    const run = testInfo.repeatEachIndex * (testInfo.project.retries + 1) + testInfo.retry;
    const minutes = (testInfo.project.name === 'phone' ? 360 : 0) + (run % 360);
    const start = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const window = `${start} to 23:59`;

    await select(page, BLUEDART).check();
    await page.getByRole('button', { name: 'Schedule pickup' }).click();
    const form = dialog(page);
    await expect(form.getByText('1 shipment, Blue Dart')).toBeVisible();
    await form.getByLabel('Window start').fill(start);
    await form.getByLabel('Window end').fill('23:59');
    await form.getByRole('button', { name: 'Confirm pickup' }).click();

    await expect(dialog(page)).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: /Pickup .* scheduled/ })).toBeVisible();

    const row = pickupRows(page, testInfo.project.name).filter({ hasText: window });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Blue Dart');
    await expect(row).toContainText('Bengaluru warehouse');
    await expect(row).toContainText('1 shipment');
    await expect(row).toContainText('Scheduled');
    // The selection is cleared once the pickup is made.
    await expect(select(page, BLUEDART)).not.toBeChecked();
  });
});

test.describe('manifest', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('prints a manifest with every AWB', async ({ page }) => {
    await page.goto(`${PICKUPS}/manifest-print/pk-001`);
    await expect(page.getByRole('heading', { level: 1, name: 'Pickup manifest' })).toBeVisible();
    await expect(page.getByTestId('sample-manifest')).toContainText('Sample manifest');

    const awbs = page.getByTestId('manifest-awb');
    await expect(awbs).toHaveCount(3);
    await expect(awbs.nth(0)).toHaveText('DEMOVERYLONGAWB00001');
    await expect(awbs.nth(1)).toHaveText('DEMODL000101');
    await expect(awbs.nth(2)).toHaveText('DEMODL000102');
    await expect(page.getByText('3 shipments').first()).toBeVisible();
    await expect(page.getByText('Bhubaneswar regional distribution hub')).toBeVisible();
    await expect(page.getByText('10:00 to 14:00')).toBeVisible();

    // The buttons are for the screen only.
    const print = page.getByRole('button', { name: 'Print manifest' });
    await expect(print).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(print).toBeHidden();
    await expect(page.getByRole('link', { name: 'Back to pickups' })).toBeHidden();
    await expect(page.getByTestId('sample-manifest')).toBeVisible();
    await expect(awbs.nth(0)).toBeVisible();
  });

  test('opens from a pickup in the list', async ({ page }, testInfo) => {
    await page.goto(PICKUPS);
    const first = pickupRows(page, testInfo.project.name).first();
    await first.getByRole('link', { name: 'Print manifest' }).click();
    await page.waitForURL('**/manifest-print/**');
    await expect(page.getByRole('heading', { level: 1, name: 'Pickup manifest' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to pickups' }).click();
    await page.waitForURL('**/orders/pickups');
  });

  test('shows a plain page for an unknown pickup', async ({ page }) => {
    // The loading screen starts the response before the page decides, so the status stays 200.
    await page.goto(`${PICKUPS}/manifest-print/${'x'.repeat(300)}`);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.getByTestId('manifest-awb')).toHaveCount(0);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone check');
    await page.goto(`${PICKUPS}/manifest-print/pk-001`);
    await expectTapTargets(page, [
      page.getByRole('link', { name: 'Back to pickups' }),
      page.getByRole('button', { name: 'Print manifest' }),
    ]);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await page.goto(`${PICKUPS}/manifest-print/pk-001`);
    await expectNoSidewaysScroll(page, SIZES);
  });
});
