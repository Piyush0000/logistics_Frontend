import { expect, test, type Page } from '@playwright/test';
import { fillDetails, openLogin, signIn } from './helpers';
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

/** Expects `first` to be listed above `second`. Only their own order is checked, because the other project moves other couriers. */
const expectBefore = (page: Page, first: string, second: string) =>
  expect
    .poll(async () => {
      const names = await order(page);
      return names.indexOf(first) < names.indexOf(second);
    })
    .toBe(true);

/** A direction to move `name` in whose neighbour is not the other project's courier, which it may be moving at the same time. */
async function pickMove(page: Page, name: string) {
  const other = Object.values(COURIER).find((courier) => courier !== name);
  const names = await order(page);
  const at = names.indexOf(name);
  const options = [
    { direction: 'up' as const, neighbour: names[at - 1] },
    { direction: 'down' as const, neighbour: names[at + 1] },
  ].filter((option): option is { direction: 'up' | 'down'; neighbour: string } => !!option.neighbour);
  const pick = options.find((option) => option.neighbour !== other) ?? options[0];
  if (!pick) throw new Error('no courier to swap with');
  return pick;
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

  test('moves a courier up and down with buttons', async ({ page }, testInfo) => {
    await openRules(page);
    const name = COURIER[projectOf(testInfo)];
    const { direction, neighbour } = await pickMove(page, name);
    const reverse = direction === 'up' ? 'down' : 'up';

    await page.getByRole('button', { name: `Move ${name} ${direction}`, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: `Moved ${name} ${direction}.` })).toBeVisible();
    await expectBefore(page, direction === 'up' ? name : neighbour, direction === 'up' ? neighbour : name);

    await page.getByRole('button', { name: `Move ${name} ${reverse}`, exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: `Moved ${name} ${reverse}.` })).toBeVisible();
    await expectBefore(page, direction === 'up' ? neighbour : name, direction === 'up' ? name : neighbour);
    expect(new Set(await order(page)).size).toBe(5);
  });

  test('moves a courier up with the keyboard', async ({ page }, testInfo) => {
    await openRules(page);
    const name = COURIER[projectOf(testInfo)];
    const { direction, neighbour } = await pickMove(page, name);
    const reverse = direction === 'up' ? 'down' : 'up';
    const [upper, lower] = direction === 'up' ? [name, neighbour] : [neighbour, name];

    await page.getByRole('button', { name: `Move ${name} ${direction}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status').filter({ hasText: `Moved ${name} ${direction}.` })).toBeVisible();
    await expectBefore(page, upper, lower);
    // The button keeps focus through the move, so the same key can move it again.
    await expect(page.getByRole('button', { name: `Move ${name} ${direction}`, exact: true })).toBeFocused();

    // Put it back with the keyboard too, so the order the other project sees is close to what it expects.
    await page.getByRole('button', { name: `Move ${name} ${reverse}`, exact: true }).focus();
    await page.keyboard.press('Space');
    await expectBefore(page, lower, upper);
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
