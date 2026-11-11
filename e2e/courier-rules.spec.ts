import { mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { e2ePort, e2eUrl, fillDetails, openLogin, signIn } from './helpers';
import { expectNoSidewaysScroll, expectSignedOutRedirect, expectTapTargets, SIZES } from './screen-checks';

const ROUTE = '/settings/courier-rules';

// The courier rules are one set shared by the desktop and phone runs, which can run at the same time.
// Each project changes only a courier and a preference of its own, and every check reads the order it
// finds on the page instead of assuming one. Each change is saved on its own, never as a whole set.
const projectOf = (testInfo: { project: { name: string } }) =>
  testInfo.project.name === 'phone' ? 'phone' : 'desktop';
const COURIER = { desktop: 'Shadowfax', phone: 'Blue Dart' } as const;
const PREFERENCE = { desktop: 'Fastest', phone: 'Lowest cost' } as const;

async function openRules(page: Page) {
  await signIn(page);
  await page.goto(ROUTE);
  await expect(page.getByRole('heading', { level: 1, name: 'Courier Rules' })).toBeVisible();
}

const order = (page: Page) =>
  page.getByTestId('courier-row').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-name')));

/**
 * The move tests run on their own server (port 3110), so nothing else changes the order while they
 * read it, and they take this lock so the desktop and phone runs do not move couriers at the same
 * time. That lets them assert the exact index a courier lands on, with no neighbour guessed
 * beforehand. A directory is made and removed as the lock, because making one is atomic.
 */
const LOCK = join(tmpdir(), `courier-rules-moves-${e2ePort(3110)}.lock`);

async function withMoveLock(run: () => Promise<void>) {
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      mkdirSync(LOCK);
      break;
    } catch {
      // A lock left by a run that crashed is older than any test, so it is cleared.
      try {
        if (Date.now() - statSync(LOCK).mtimeMs > 90_000) rmSync(LOCK, { recursive: true, force: true });
      } catch {}
      if (Date.now() > deadline) throw new Error('Waited too long for the courier move lock.');
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  try {
    await run();
  } finally {
    rmSync(LOCK, { recursive: true, force: true });
  }
}

test.describe('courier rules', () => {
  test('sends signed-out visitors to login', async ({ page }) => {
    await expectSignedOutRedirect(page, ROUTE);
  });

  test('shows the page title and sample label', async ({ page }) => {
    await openRules(page);
    await expect(page.getByTestId('rules-card').getByText('Sample data')).toBeVisible();
  });

  test('lists every courier once, with a preference chosen', async ({ page }) => {
    await openRules(page);
    const names = await order(page);
    expect(names).toHaveLength(5);
    expect(new Set(names).size).toBe(5);
    expect([...names].sort()).toEqual(['Blue Dart', 'DHL', 'Delhivery', 'Ekart', 'Shadowfax']);
    await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
  });

  test('shows the section list on desktop and a back link on phones', async ({ page }, testInfo) => {
    await openRules(page);
    const list = page.getByRole('navigation', { name: 'Settings sections' });
    if (projectOf(testInfo) === 'phone') {
      await expect(page.getByRole('link', { name: 'Back to Settings' })).toBeVisible();
    } else {
      await expect(list.getByRole('link', { name: 'Courier Rules' })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('saves the preference', async ({ page }, testInfo) => {
    await openRules(page);
    const label = PREFERENCE[projectOf(testInfo)];
    const mine = page.getByRole('radio', { name: label });
    // A saved choice that is already picked fires no change, so step away from it first.
    if (await mine.isChecked()) {
      await page.getByRole('radio', { name: 'Custom' }).check();
      await expect(page.getByRole('radio', { name: 'Custom' })).toBeChecked();
    }
    await mine.check();
    await expect(page.getByRole('status').filter({ hasText: 'Preference saved.' })).toBeVisible();
    await expect(page.getByRole('radio', { name: label })).toBeChecked();
  });

  test('switches a courier off and on', async ({ page }, testInfo) => {
    await openRules(page);
    const name = COURIER[projectOf(testInfo)];
    const toggle = page.getByRole('switch', { name: `Use ${name}`, exact: true });
    const row = page.locator(`[data-testid="courier-row"][data-name="${name}"]`);

    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(page.getByRole('status').filter({ hasText: `${name} is switched off.` })).toBeVisible();
    await expect(toggle).not.toBeChecked();
    await expect(row.getByText('Off', { exact: true })).toBeVisible();

    await toggle.click();
    await expect(page.getByRole('status').filter({ hasText: `${name} is switched on.` })).toBeVisible();
    await expect(toggle).toBeChecked();
    await expect(row.getByText('Off', { exact: true })).toHaveCount(0);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await openRules(page);
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
    await page.goto(ROUTE);
    await expect(page.getByRole('heading', { level: 1, name: 'Courier Rules' })).toBeVisible();
    await expectNoSidewaysScroll(page, [{ width: 320, height: 568 }]);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await openRules(page);
    const name = COURIER.phone;
    await expectTapTargets(page, [
      page.getByRole('link', { name: 'Back to Settings' }),
      page.getByRole('radio', { name: 'Custom' }),
      page.getByRole('switch', { name: `Use ${name}`, exact: true }),
      page.getByRole('button', { name: `Move ${name} up`, exact: true }),
      page.getByRole('button', { name: `Move ${name} down`, exact: true }),
    ]);
  });
});

test.describe('courier moves', () => {
  test.use({ baseURL: e2eUrl(3110) });

  // Moves the courier one place, away from the end it is next to, and returns where it landed.
  async function moveOnce(page: Page, name: string, how: (button: ReturnType<Page['getByRole']>) => Promise<void>) {
    const before = (await order(page)).indexOf(name);
    expect(before).toBeGreaterThanOrEqual(0);
    const direction = before === 0 ? 'down' : 'up';
    const button = page.getByRole('button', { name: `Move ${name} ${direction}`, exact: true });
    await how(button);
    await expect(page.getByRole('status').filter({ hasText: `Moved ${name} ${direction}.` })).toBeVisible();
    // Read from the page after the click: exactly one place, in the direction asked, from where it was.
    await expect.poll(async () => (await order(page)).indexOf(name)).toBe(before + (direction === 'up' ? -1 : 1));
    expect(new Set(await order(page)).size).toBe(5);
    return { before, direction } as const;
  }

  test('moves a courier up and down with buttons', async ({ page }, testInfo) => {
    await withMoveLock(async () => {
      await openRules(page);
      const name = COURIER[projectOf(testInfo)];
      const { before, direction } = await moveOnce(page, name, (button) => button.click());
      const reverse = direction === 'up' ? 'down' : 'up';

      await page.getByRole('button', { name: `Move ${name} ${reverse}`, exact: true }).click();
      await expect(page.getByRole('status').filter({ hasText: `Moved ${name} ${reverse}.` })).toBeVisible();
      await expect.poll(async () => (await order(page)).indexOf(name)).toBe(before);
    });
  });

  test('moves a courier up with the keyboard', async ({ page }, testInfo) => {
    await withMoveLock(async () => {
      await openRules(page);
      const name = COURIER[projectOf(testInfo)];
      const { before, direction } = await moveOnce(page, name, async (button) => {
        await button.focus();
        await page.keyboard.press('Enter');
      });
      // The button keeps focus through the move, so the same key can move it again.
      await expect(page.getByRole('button', { name: `Move ${name} ${direction}`, exact: true })).toBeFocused();

      const reverse = direction === 'up' ? 'down' : 'up';
      await page.getByRole('button', { name: `Move ${name} ${reverse}`, exact: true }).focus();
      await page.keyboard.press('Space');
      await expect.poll(async () => (await order(page)).indexOf(name)).toBe(before);
    });
  });

  test('does not move the first courier up', async ({ page }) => {
    await withMoveLock(async () => {
      await openRules(page);
      const first = (await order(page))[0];
      expect(first).toBeTruthy();
      // The first courier cannot go up: the button stays, is marked, and the order does not change.
      const before = await order(page);
      const top = page.getByRole('button', { name: `Move ${first} up`, exact: true });
      await expect(top).toHaveAttribute('aria-disabled', 'true');
      await top.click({ force: true });
      await expect(page.getByRole('status').filter({ hasText: 'Moved' })).toHaveCount(0);
      expect(await order(page)).toEqual(before);
    });
  });
});
