import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const WEIGHT = '/reconciliation/weight';
const LONG_AWB = 'DEMOLONGAWBWEIGHT001';
const MB = 1024 * 1024;

// Only read or left unanswered: wd-001 (long values), wd-006 and wd-007.
const FREE_ROW = 'DEMOWT006';
const CLOSED_ROW = 'DEMOWT007';

const projectOf = (testInfo: { project: { name: string } }) =>
  testInfo.project.name === 'phone' ? 'phone' : 'desktop';

// Answering a row is permanent, and every run on one server (desktop, phone, --repeat-each and
// retries) shares the sample store. So each run of a test that answers a row takes its own row
// from the open rows the sample keeps for this, wd-015 to wd-038 (ANSWERABLE_TEST_ROWS in
// src/lib/data/weight/mock.ts), and finds it by AWB.
const FIRST_ANSWERABLE = 15;
const ANSWERABLE_ROWS = 24;
const ANSWERING_TESTS = ['dispute', 'accept'] as const;

function answerableRow(testInfo: TestInfo, kind: (typeof ANSWERING_TESTS)[number]) {
  const run = testInfo.repeatEachIndex * (testInfo.project.retries + 1) + testInfo.retry;
  const lane = run * 2 + (projectOf(testInfo) === 'phone' ? 1 : 0);
  const slot = lane * ANSWERING_TESTS.length + ANSWERING_TESTS.indexOf(kind);
  if (slot >= ANSWERABLE_ROWS) {
    throw new Error(`Run ${run} needs answerable sample row ${slot + 1}, but the sample has ${ANSWERABLE_ROWS}.`);
  }
  return `DEMOWT${String(FIRST_ANSWERABLE + slot).padStart(3, '0')}`;
}

function rows(page: Page, projectName: string) {
  return projectName === 'phone' ? page.getByTestId('weight-item') : page.getByTestId('weight-row');
}

const rowFor = (page: Page, projectName: string, awb: string) =>
  rows(page, projectName).filter({ hasText: awb });

async function open(page: Page, route = WEIGHT) {
  await signIn(page);
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1, name: 'Weight discrepancies' })).toBeVisible();
}

const statusPicker = (page: Page) => page.getByRole('button', { name: /^Status/ });

function png(name: string, size: number, mimeType = 'image/png') {
  return { name, mimeType, buffer: Buffer.alloc(size, 1) };
}

async function openDispute(page: Page, projectName: string, awb: string) {
  await rowFor(page, projectName, awb).getByRole('button', { name: 'Dispute' }).click();
  const dialog = page.getByRole('dialog', { name: 'Dispute weight charge' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, WEIGHT);
});

test('shows the page title and sample label', async ({ page }) => {
  await open(page);

  await expect(page.getByTestId('weight-summary').getByText('Sample data')).toBeVisible();
  await expect(page.getByTestId('weight-card').getByText('Sample data')).toBeVisible();
});

test('does not scroll sideways at any size', async ({ page }) => {
  await open(page);
  await expectNoSidewaysScroll(page, SIZES);
});

test('wraps long values', async ({ page }, testInfo) => {
  await open(page);
  const row = rowFor(page, projectOf(testInfo), LONG_AWB);

  await expect(row).toBeVisible();
  await expect(row).toContainText('₹1,00,00,000.00');
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  // The amount stays on one line, never split in the middle of its digits.
  await page.setViewportSize({ width: 320, height: 568 });
  const amount = page.getByTestId('weight-card').getByText('₹1,00,00,000.00').locator('visible=true').first();
  expect((await amount.boundingBox())?.height ?? 99).toBeLessThan(30);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await open(page);
  const row = rowFor(page, 'phone', FREE_ROW);

  await expectTapTargets(page, [
    statusPicker(page),
    page.getByRole('searchbox', { name: 'AWB', exact: true }),
    page.getByRole('button', { name: 'Apply' }),
    page.getByRole('link', { name: 'Clear' }),
    row.getByRole('button', { name: 'Accept' }),
    row.getByRole('button', { name: 'Dispute' }),
    page.getByRole('link', { name: 'Next page' }),
  ]);

  await row.getByRole('button', { name: 'Dispute' }).click();
  const dialog = page.getByRole('dialog', { name: 'Dispute weight charge' });
  await expectTapTargets(page, [
    dialog.getByLabel('Note'),
    dialog.getByLabel('Evidence images'),
    dialog.getByRole('button', { name: 'Send dispute' }),
    dialog.getByRole('button', { name: 'Cancel' }),
  ]);
});

test.describe('discrepancy list', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the summary tiles', async ({ page }) => {
    const summary = page.getByTestId('weight-summary');

    for (const label of ['Open', 'Disputed', 'Extra charges pending']) {
      await expect(summary.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('shows the columns on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop table only');
    const table = page.getByRole('table', { name: 'Weight discrepancies' });

    for (const heading of ['AWB', 'Courier', 'Declared', 'Charged', 'Extra charge', 'Status', 'Respond by', 'Action']) {
      await expect(table.getByRole('columnheader', { name: heading })).toBeVisible();
    }
  });

  test('shows the weights, charge and status for a row', async ({ page }, testInfo) => {
    const row = rowFor(page, projectOf(testInfo), FREE_ROW);

    await expect(row).toContainText('kg');
    await expect(row).toContainText('₹');
    await expect(row).toContainText('Open');
  });

  test('moves between pages', async ({ page }) => {
    await expect(page.getByTestId('pagination')).toBeVisible();
    await page.getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);

    await page.getByRole('link', { name: 'Previous page' }).click();
    await expect(page).toHaveURL(new RegExp(`${WEIGHT}$`));
  });

  test('filters by status', async ({ page }, testInfo) => {
    const list = rows(page, projectOf(testInfo));
    await statusPicker(page).click();
    await expect(page.getByRole('option')).toHaveText(['All statuses', 'Open', 'Disputed', 'Accepted', 'Resolved']);
    await page.getByRole('option', { name: 'Disputed' }).click();
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page).toHaveURL(/status=disputed/);
    expect(await list.count()).toBeGreaterThan(0);
    for (const row of await list.all()) {
      await expect(row).toContainText('Disputed');
      await expect(row.getByRole('button', { name: 'Accept' })).toHaveCount(0);
    }

    await page.getByRole('link', { name: 'Clear' }).click();
    await expect(page).toHaveURL(new RegExp(`${WEIGHT}$`));
  });

  test('finds an AWB', async ({ page }, testInfo) => {
    await page.getByRole('searchbox', { name: 'AWB', exact: true }).fill('demolong');
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page).toHaveURL(/q=demolong/);
    await expect(rows(page, projectOf(testInfo))).toHaveCount(1);
    await expect(rowFor(page, projectOf(testInfo), LONG_AWB)).toBeVisible();
  });
});

test('shows an empty state', async ({ page }) => {
  await open(page, `${WEIGHT}?q=no-such-awb`);

  await expect(page.getByText('No weight discrepancies match these filters.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Next page' })).toHaveCount(0);
});

test('ignores bad URL input', async ({ page }, testInfo) => {
  const long = 'x'.repeat(300);
  await signIn(page);
  for (const query of ['page=abc', 'page=-1', 'status=FOO', `status=${long}`]) {
    await page.goto(`${WEIGHT}?${query}`);
    await expect(rows(page, projectOf(testInfo)).first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
  }
  // Text that matches nothing shows the empty message, with no error.
  await page.goto(`${WEIGHT}?q=${long}`);
  await expect(page.getByText('No weight discrepancies match these filters.')).toBeVisible();
});

test.describe('dispute', () => {
  test('rejects a dispute with no images', async ({ page }, testInfo) => {
    await open(page);
    const dialog = await openDispute(page, projectOf(testInfo), FREE_ROW);

    await dialog.getByLabel('Note').fill('The parcel was weighed at 0.5 kg when packed.');
    await dialog.getByRole('button', { name: 'Send dispute' }).click();

    await expect(dialog.getByRole('alert')).toHaveText('Add at least 1 image as evidence.');
    await expect(dialog).toBeVisible();
  });

  test('rejects a 6 MB image', async ({ page }, testInfo) => {
    await open(page);
    const dialog = await openDispute(page, projectOf(testInfo), FREE_ROW);

    await dialog.getByLabel('Note').fill('The parcel was weighed at 0.5 kg when packed.');
    await dialog.getByLabel('Evidence images').setInputFiles(png('scale-photo.png', 6 * MB));
    await dialog.getByRole('button', { name: 'Send dispute' }).click();

    await expect(dialog.getByRole('alert')).toHaveText('scale-photo.png is larger than 5 MB.');
  });

  test('rejects other file types, more than 3 images and a short note', async ({ page }, testInfo) => {
    await open(page);
    const dialog = await openDispute(page, projectOf(testInfo), FREE_ROW);
    const send = dialog.getByRole('button', { name: 'Send dispute' });
    const alert = dialog.getByRole('alert');

    await dialog.getByLabel('Note').fill('The parcel was weighed at 0.5 kg when packed.');
    await dialog.getByLabel('Evidence images').setInputFiles(png('notes.gif', 1000, 'image/gif'));
    await send.click();
    await expect(alert).toHaveText('notes.gif is not a JPG or PNG image.');

    await dialog
      .getByLabel('Evidence images')
      .setInputFiles([1, 2, 3, 4].map((n) => png(`photo-${n}.png`, 1000)));
    await send.click();
    await expect(alert).toHaveText('Add no more than 3 images.');

    await dialog.getByLabel('Evidence images').setInputFiles(png('photo.png', 1000));
    await dialog.getByLabel('Note').fill('Too short');
    await send.click();
    await expect(alert).toContainText('at least 10 characters');
  });

  test('marks a row disputed after submitting', async ({ page }, testInfo) => {
    const project = projectOf(testInfo);
    const awb = answerableRow(testInfo, 'dispute');
    await open(page, `${WEIGHT}?q=${awb}`);
    const dialog = await openDispute(page, project, awb);

    await dialog.getByLabel('Note').fill('The parcel was weighed at 0.5 kg when packed.');
    await dialog
      .getByLabel('Evidence images')
      .setInputFiles([png('scale-photo.png', 2000), png('box-photo.jpg', 3000, 'image/jpeg')]);
    await dialog.getByRole('button', { name: 'Send dispute' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('status').filter({ hasText: `Dispute sent for ${awb}` })).toBeVisible();
    const row = rowFor(page, project, awb);
    await expect(row).toContainText('Disputed');
    await expect(row.getByRole('button', { name: 'Dispute' })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Accept' })).toHaveCount(0);
  });

  test('accepts a charge', async ({ page }, testInfo) => {
    const project = projectOf(testInfo);
    const awb = answerableRow(testInfo, 'accept');
    await open(page, `${WEIGHT}?q=${awb}`);

    await rowFor(page, project, awb).getByRole('button', { name: 'Accept' }).click();

    await expect(page.getByRole('status').filter({ hasText: `Charge accepted for ${awb}` })).toBeVisible();
    await expect(rowFor(page, project, awb)).toContainText('Accepted');
    await expect(rowFor(page, project, awb).getByRole('button', { name: 'Accept' })).toHaveCount(0);
  });

  test('blocks disputes after the response window', async ({ page }, testInfo) => {
    await open(page);
    const row = rowFor(page, projectOf(testInfo), CLOSED_ROW);

    await expect(row).toContainText('Response window closed');
    await expect(row.getByRole('button', { name: 'Dispute' })).toHaveCount(0);
    // An open row inside its window has no such message.
    await expect(rowFor(page, projectOf(testInfo), FREE_ROW)).not.toContainText('Response window closed');
  });
});
