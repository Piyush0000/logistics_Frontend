import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const TICKETS = '/support/tickets';
const LONG_AWB = 'DEMOLONGAWBTICKET001';
const LONG_TICKET = `${TICKETS}/tk-001`;
const RESOLVED_NOTE = 'This ticket is resolved. Reply to reopen it.';
const BODY = 'The pickup was booked for yesterday and nobody came to collect the parcels.';

const projectOf = (testInfo: { project: { name: string } }) =>
  testInfo.project.name === 'phone' ? 'phone' : 'desktop';

// Replying reopens a resolved ticket for good, and every run on one server (desktop, phone,
// --repeat-each and retries) shares the sample store. So each run of the reopen test takes its
// own resolved ticket from the ones the sample keeps for this, tk-009 to tk-020
// (RESOLVED_TEST_TICKETS in src/lib/data/support/mock.ts). Every other test that changes
// anything raises a ticket with a subject of its own, which no other run touches.
const FIRST_RESOLVED_TEST_TICKET = 9;
const RESOLVED_TEST_TICKETS = 12;

function resolvedTicket(testInfo: TestInfo) {
  const run = testInfo.repeatEachIndex * (testInfo.project.retries + 1) + testInfo.retry;
  const slot = run * 2 + (projectOf(testInfo) === 'phone' ? 1 : 0);
  if (slot >= RESOLVED_TEST_TICKETS) {
    throw new Error(`Run ${run} needs resolved sample ticket ${slot + 1}, but the sample has ${RESOLVED_TEST_TICKETS}.`);
  }
  return `tk-${String(FIRST_RESOLVED_TEST_TICKET + slot).padStart(3, '0')}`;
}

/** A subject no other project, repeat or retry uses. */
function uniqueSubject(testInfo: TestInfo, label: string) {
  return `${label} ${projectOf(testInfo)} run ${testInfo.repeatEachIndex}.${testInfo.retry} ${Date.now()}`;
}

const rows = (page: Page, projectName: string) =>
  projectName === 'phone' ? page.getByTestId('ticket-item') : page.getByTestId('ticket-row');

async function open(page: Page, route = TICKETS) {
  await signIn(page);
  await page.goto(route);
  // A ticket page is titled with the ticket's subject, so only the list has a fixed title.
  if (route === TICKETS || route.startsWith(`${TICKETS}?`)) {
    await expect(page.getByRole('heading', { level: 1, name: 'Support tickets' })).toBeVisible();
  } else {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
}

const statusPicker = (page: Page) => page.getByRole('button', { name: /^Status/ });
const newTicketDialog = (page: Page) => page.getByRole('dialog', { name: 'New ticket' });

async function fillTicket(page: Page, fields: { subject: string; body: string; awb?: string; category?: string }) {
  const dialog = newTicketDialog(page);
  await dialog.getByLabel('Subject', { exact: true }).fill(fields.subject);
  if (fields.category) {
    await dialog.getByRole('button', { name: /^Category/ }).click();
    await page.getByRole('option', { name: fields.category, exact: true }).click();
  }
  if (fields.awb !== undefined) await dialog.getByLabel('AWB (optional)', { exact: true }).fill(fields.awb);
  await dialog.getByLabel('Message', { exact: true }).fill(fields.body);
  return dialog;
}

test('sends signed-out visitors to login', async ({ page }) => {
  await expectSignedOutRedirect(page, TICKETS);
  await expectSignedOutRedirect(page, LONG_TICKET);
});

test('shows the page title and sample label', async ({ page }) => {
  await open(page);
  await expect(page.getByTestId('tickets-card').getByText('Sample data')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New ticket', exact: true })).toBeVisible();
});

test('does not scroll sideways at any size', async ({ page }) => {
  await open(page);
  await expectNoSidewaysScroll(page, SIZES);
  await page.goto(LONG_TICKET);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoSidewaysScroll(page, SIZES);
  await page.goto(`${TICKETS}?new=1`);
  await expect(newTicketDialog(page)).toBeVisible();
  await expectNoSidewaysScroll(page, SIZES);
});

test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
  await open(page);

  await expectTapTargets(page, [
    statusPicker(page),
    page.getByRole('button', { name: 'Apply' }),
    page.getByRole('link', { name: 'Clear' }),
    page.getByRole('button', { name: 'New ticket', exact: true }),
    page.getByTestId('ticket-item').first().getByRole('link'),
    page.getByRole('link', { name: 'Next page' }),
  ]);

  await page.getByRole('button', { name: 'New ticket', exact: true }).click();
  const dialog = newTicketDialog(page);
  await expectTapTargets(page, [
    dialog.getByLabel('Subject', { exact: true }),
    dialog.getByRole('button', { name: /^Category/ }),
    dialog.getByLabel('AWB (optional)', { exact: true }),
    dialog.getByLabel('Message', { exact: true }),
    dialog.getByRole('button', { name: 'Raise ticket' }),
    dialog.getByRole('button', { name: 'Cancel' }),
  ]);

  await page.goto(LONG_TICKET);
  await expectTapTargets(page, [
    page.getByLabel('Reply', { exact: true }),
    page.getByRole('button', { name: 'Send reply' }),
    page.getByRole('link', { name: 'All tickets' }),
  ]);
});

test('wraps long values', async ({ page }, testInfo) => {
  await open(page, `${TICKETS}?status=awaiting_you`);
  const row = rows(page, projectOf(testInfo)).filter({ hasText: LONG_AWB });

  await expect(row).toBeVisible();
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  await page.goto(LONG_TICKET);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Weight charge on');
  await expect(page.getByTestId('ticket-meta')).toContainText(LONG_AWB);
  await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
});

test.describe('ticket list', () => {
  test.beforeEach(async ({ page }) => {
    await open(page);
  });

  test('shows the columns on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Desktop table only');
    const table = page.getByRole('table', { name: 'Support tickets' });

    for (const heading of ['Subject', 'Category', 'AWB', 'Status', 'Updated']) {
      await expect(table.getByRole('columnheader', { name: heading })).toBeVisible();
    }
  });

  test('moves between pages', async ({ page }) => {
    await expect(page.getByTestId('pagination')).toBeVisible();
    await page.getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    expect(await rows(page, 'desktop').count() + (await rows(page, 'phone').count())).toBeGreaterThan(0);

    await page.getByRole('link', { name: 'Previous page' }).click();
    await expect(page).toHaveURL(new RegExp(`${TICKETS}$`));
  });

  test('filters by status', async ({ page }, testInfo) => {
    const list = rows(page, projectOf(testInfo));
    await statusPicker(page).click();
    await expect(page.getByRole('option')).toHaveText(['All statuses', 'Open', 'Awaiting you', 'Resolved']);
    await page.getByRole('option', { name: 'Resolved' }).click();
    await page.getByRole('button', { name: 'Apply' }).click();

    await expect(page).toHaveURL(/status=resolved/);
    expect(await list.count()).toBeGreaterThan(0);
    for (const row of await list.all()) {
      await expect(row).toContainText('Resolved');
    }

    await page.getByRole('link', { name: 'Clear' }).click();
    await expect(page).toHaveURL(new RegExp(`${TICKETS}$`));
  });

  test('opens a ticket from the list', async ({ page }, testInfo) => {
    await page.goto(`${TICKETS}?status=awaiting_you`);
    await rows(page, projectOf(testInfo)).filter({ hasText: LONG_AWB }).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/support\/tickets\/tk-001$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Weight charge on');
  });
});

test('ignores bad URL input', async ({ page }, testInfo) => {
  const long = 'x'.repeat(300);
  await signIn(page);
  for (const query of ['page=abc', 'page=-1', 'page=999', 'status=FOO', `status=${long}`, 'new=FOO', `q=${long}`]) {
    const response = await page.goto(`${TICKETS}?${query}`);
    expect(response?.status(), query).toBe(200);
    await expect(rows(page, projectOf(testInfo)).first()).toBeVisible();
    await expect(page.getByText('Something went wrong')).toHaveCount(0);
    await expect(newTicketDialog(page)).toHaveCount(0);
  }
});

test('returns not found for an unknown ticket id', async ({ page }) => {
  await signIn(page);
  for (const id of ['tk-no-such-ticket', 'x'.repeat(300)]) {
    const response = await page.goto(`${TICKETS}/${id}`);
    expect(response?.status(), id).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  }
});

test.describe('new ticket', () => {
  test('opens from the button and closes without changes', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'New ticket', exact: true }).click();
    await expect(newTicketDialog(page)).toBeVisible();

    await newTicketDialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(newTicketDialog(page)).toBeHidden();
  });

  test('opens from the new=1 link and drops it when closed', async ({ page }) => {
    await open(page, `${TICKETS}?new=1`);
    await expect(newTicketDialog(page)).toBeVisible();

    await newTicketDialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(newTicketDialog(page)).toBeHidden();
    await expect(page).toHaveURL(new RegExp(`${TICKETS}$`));
  });

  test('rejects a body under 20 characters', async ({ page }, testInfo) => {
    await open(page);
    await page.getByRole('button', { name: 'New ticket', exact: true }).click();
    const dialog = await fillTicket(page, { subject: uniqueSubject(testInfo, 'Short body'), body: 'Too short' });
    await dialog.getByRole('button', { name: 'Raise ticket' }).click();

    await expect(dialog.getByRole('alert')).toHaveText('Describe the problem in 20 to 5,000 characters.');
    await expect(dialog).toBeVisible();
  });

  test('rejects a short subject and more than one AWB', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'New ticket', exact: true }).click();
    const dialog = await fillTicket(page, { subject: 'Help', body: BODY });
    await dialog.getByRole('button', { name: 'Raise ticket' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('The subject must be 5 to 120 characters.');

    await dialog.getByLabel('Subject', { exact: true }).fill('Missed pickup');
    await dialog.getByLabel('AWB (optional)', { exact: true }).fill('DEMOEK001, DEMOEK002');
    await dialog.getByRole('button', { name: 'Raise ticket' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Enter one AWB only.');
  });

  test('creates a ticket and opens it', async ({ page }, testInfo) => {
    const subject = uniqueSubject(testInfo, 'Missed pickup');
    await open(page);
    await page.getByRole('button', { name: 'New ticket', exact: true }).click();
    const dialog = await fillTicket(page, { subject, body: BODY, awb: 'DEMOEK001', category: 'Pickup' });
    await dialog.getByRole('button', { name: 'Raise ticket' }).click();

    await expect(page).toHaveURL(/\/support\/tickets\/tk-\d+$/);
    await expect(page.getByRole('heading', { level: 1, name: subject })).toBeVisible();
    const meta = page.getByTestId('ticket-meta');
    await expect(meta).toContainText('Open');
    await expect(meta).toContainText('Pickup');
    await expect(meta).toContainText('DEMOEK001');
    const messages = page.getByTestId('ticket-message');
    await expect(messages).toHaveCount(1);
    await expect(messages.first()).toContainText(BODY);
    await expect(messages.first()).toContainText('You');
    await expect(page.getByText(RESOLVED_NOTE)).toHaveCount(0);
  });
});

test('does not reopen the dialog on Back after creating from ?new=1', async ({ page }, testInfo) => {
  await signIn(page);
  await page.goto(`${TICKETS}?new=1`);
  await expect(newTicketDialog(page)).toBeVisible();
  const dialog = await fillTicket(page, { subject: uniqueSubject(testInfo, 'Back check'), body: BODY });
  await dialog.getByRole('button', { name: 'Raise ticket' }).click();
  await expect(page).toHaveURL(/\/support\/tickets\/tk-\d+$/);

  await page.goBack();
  await expect(page).not.toHaveURL(/new=1/);
  await expect(newTicketDialog(page)).toHaveCount(0);
});

test.describe('reply', () => {
  test('adds a reply to the thread', async ({ page }, testInfo) => {
    const subject = uniqueSubject(testInfo, 'Reply thread');
    await open(page);
    await page.getByRole('button', { name: 'New ticket', exact: true }).click();
    const dialog = await fillTicket(page, { subject, body: BODY });
    await dialog.getByRole('button', { name: 'Raise ticket' }).click();
    await expect(page.getByRole('heading', { level: 1, name: subject })).toBeVisible();

    await page.getByLabel('Reply', { exact: true }).fill('Here is the extra detail you asked for.');
    await page.getByRole('button', { name: 'Send reply' }).click();

    await expect(page.getByTestId('ticket-message')).toHaveCount(2);
    await expect(page.getByTestId('ticket-message').last()).toContainText('Here is the extra detail you asked for.');
    await expect(page.getByLabel('Reply', { exact: true })).toHaveValue('');
  });

  test('refuses an empty reply', async ({ page }) => {
    await open(page, LONG_TICKET);
    await page.getByRole('button', { name: 'Send reply' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Write a reply' })).toBeVisible();
  });

  test('reopens a resolved ticket on reply', async ({ page }, testInfo) => {
    const id = resolvedTicket(testInfo);
    await open(page, `${TICKETS}/${id}`);

    await expect(page.getByText(RESOLVED_NOTE)).toBeVisible();
    await expect(page.getByTestId('ticket-meta')).toContainText('Resolved');
    const before = await page.getByTestId('ticket-message').count();

    await page.getByLabel('Reply', { exact: true }).fill('The problem has come back, please look again.');
    await page.getByRole('button', { name: 'Send reply' }).click();

    await expect(page.getByTestId('ticket-meta')).toContainText('Open');
    await expect(page.getByText(RESOLVED_NOTE)).toHaveCount(0);
    await expect(page.getByTestId('ticket-message')).toHaveCount(before + 1);
  });
});
