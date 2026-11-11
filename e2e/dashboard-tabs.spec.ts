import { expect, test } from '@playwright/test';
import { signIn } from './helpers';
import { expectNoSidewaysScroll, expectTapTargets, SIZES } from './screen-checks';

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test.describe('dashboard tabs', () => {
  test('opens a tab from the URL', async ({ page }) => {
    await page.goto('/dashboard?tab=pickups');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
    await expect(page.getByRole('tab', { name: 'Pickups' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tab', { name: 'Pickups' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('pickups-card')).toBeVisible();
    await expect(page.getByTestId('kpi-cards')).toBeHidden();
  });

  test('moves between Overview and Pickups with the tab links', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Pickups' })).toHaveAttribute('href', '/dashboard?tab=pickups');
    await page.getByRole('tab', { name: 'Pickups' }).click();
    await expect(page).toHaveURL(/\/dashboard\?tab=pickups$/);
    await expect(page.getByTestId('pickups-card')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('href', '/dashboard');
    await page.getByRole('tab', { name: 'Overview' }).click();
    await expect(page.getByTestId('kpi-cards')).toBeVisible();
  });

  test('ignores an unknown tab', async ({ page }) => {
    await page.goto('/dashboard?tab=FOO');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('kpi-cards')).toBeVisible();
  });

  test('falls back to Overview for an unknown tab and enables every tab', async ({ page }) => {
    await page.goto('/dashboard?tab=foo');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('kpi-cards')).toBeVisible();
    for (const name of ['Overview', 'Pickups', 'NDR', 'RTO', 'Delivered', 'Revenue', 'SMS']) {
      await expect(page.getByRole('tab', { name })).toBeEnabled();
    }
  });
});

test.describe('pickups tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=pickups');
    await expect(page.getByTestId('pickups-card')).toBeVisible();
  });

  test('shows the tiles, the sample label and a 7-day chart', async ({ page }) => {
    const card = page.getByTestId('pickups-card');
    await expect(card.getByText('Sample data')).toBeVisible();
    await expect(card.getByTestId('tile-Scheduled today')).toBeVisible();
    await expect(card.getByTestId('tile-Picked up today')).toBeVisible();
    await expect(card.getByTestId('tile-Pending pickup')).toBeVisible();
    await expect(card.getByRole('img', { name: /^Pickups in the last 7 days\./ })).toBeVisible();
    await expect(card.locator('[data-bar]')).toHaveCount(7);
    await expect(card.getByRole('table')).toHaveCount(1);
  });

  test('keeps the tiles, the chart and the pickups page consistent in one render', async ({ page, context }, testInfo) => {
    // Other specs add pickups to the shared sample list, so only relations that hold within one
    // render are checked here. Exact values are covered by the summarizePickups unit tests.
    const card = page.getByTestId('pickups-card');
    const tile = async (name: string) => {
      const text = (await card.getByTestId(`tile-${name}`).innerText()).replace(name, '');
      const match = text.match(/\d+/);
      expect(match, `${name} tile shows a whole number`).not.toBeNull();
      return Number(match![0]);
    };
    const scheduled = await tile('Scheduled today');
    const pickedUp = await tile('Picked up today');
    const pending = await tile('Pending pickup');

    const values = await card.locator('table tbody tr td').allInnerTexts();
    expect(values).toHaveLength(7);
    for (const value of values) expect(value).toMatch(/^\d+$/);
    expect(Number(values[6])).toBe(scheduled + pickedUp);

    // Open the pickups page in the same test and compare Pending with its Ready to ship list.
    const other = await context.newPage();
    await other.goto('/orders/pickups');
    const rows = testInfo.project.name === 'phone' ? other.getByTestId('ready-item') : other.getByTestId('ready-row');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBe(pending);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps the chart inside its card at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const card = await page.getByTestId('pickups-card').boundingBox();
    const chart = await page.getByRole('img', { name: /^Pickups in the last 7 days/ }).boundingBox();
    expect(chart!.x + chart!.width).toBeLessThanOrEqual(card!.x + card!.width);
    expect(chart!.width).toBeGreaterThan(200);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    await expectTapTargets(page, [
      page.getByRole('tab', { name: 'Overview' }),
      page.getByRole('tab', { name: 'Pickups' }),
    ]);
  });
});

test.describe('NDR tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=ndr');
    await expect(page.getByTestId('ndr-tab-card')).toBeVisible();
  });

  test('NDR tab shows reasons and links to NDR', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard');
    await expect(page.getByRole('tab', { name: 'NDR' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'NDR' })).toHaveAttribute('href', '/dashboard?tab=ndr');
    const card = page.getByTestId('ndr-tab-card');
    await expect(card.getByText('Sample data')).toBeVisible();
    for (const label of ['NDR Order', 'Re-attempted', 'NDR Delivered', 'NDR Returned']) {
      await expect(card.getByTestId(`tile-${label}`)).toBeVisible();
    }
    await expect(card.getByRole('img', { name: /^NDR reasons\./ })).toBeVisible();
    expect(await card.locator('[data-bar]').count()).toBeGreaterThan(0);
    await expect(page.getByTestId('kpi-cards')).toBeHidden();
    await card.getByRole('link', { name: 'View all NDR' }).click();
    await page.waitForURL('**/ndr');
  });

  test('keeps the full reason in the chart table and bar titles', async ({ page }) => {
    const card = page.getByTestId('ndr-tab-card');
    await expect(card.getByRole('columnheader', { name: 'Reason' })).toHaveCount(1);
    await expect(card.getByRole('rowheader', { name: 'Door locked / Premise closed' })).toHaveCount(1);
    await expect(card.locator('[data-bar] title', { hasText: 'Customer refused delivery (COD amount mismatch)' })).toHaveCount(1);
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    await expectTapTargets(page, [
      page.getByRole('tab', { name: 'NDR' }),
      page.getByRole('link', { name: 'View all NDR' }),
    ]);
  });
});

test.describe('RTO tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=rto');
    await expect(page.getByTestId('rto-tab-card')).toBeVisible();
  });

  test('charts as many shipments as the tiles count', async ({ page }) => {
    const card = page.getByTestId('rto-tab-card');
    const tile = async (name: string) =>
      Number((await card.getByTestId(`tile-${name}`).innerText()).match(/\d+/)![0]);
    const values = await card.locator('table tbody tr td').allInnerTexts();
    const chartTotal = values.reduce((sum, v) => sum + Number(v), 0);
    expect(chartTotal).toBe((await tile('RTO in progress')) + (await tile('RTO delivered')));
  });

  test('shows counts, a courier chart and a link to RTO', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'RTO' })).toHaveAttribute('aria-selected', 'true');
    const card = page.getByTestId('rto-tab-card');
    await expect(card.getByText('Sample data')).toBeVisible();
    await expect(card.getByTestId('tile-RTO in progress')).toContainText('3');
    await expect(card.getByTestId('tile-RTO delivered')).toContainText('2');
    await expect(card.getByRole('img', { name: /^RTO by courier\./ })).toBeVisible();
    await expect(card.locator('[data-bar]')).toHaveCount(4);
    await expect(card.getByRole('columnheader', { name: 'Courier' })).toHaveCount(1);
    await expect(card.getByTestId('rto-chart-note')).toHaveCount(0);
    await card.getByRole('link', { name: 'View all RTO' }).click();
    await page.waitForURL('**/rto');
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    await expectTapTargets(page, [
      page.getByRole('tab', { name: 'RTO' }),
      page.getByRole('link', { name: 'View all RTO' }),
    ]);
  });
});

const parseNumber = (text: string) => Number(text.replace(/[^\d.]/g, ''));

test.describe('delivered tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=delivered');
    await expect(page.getByTestId('delivered-total-card')).toBeVisible();
  });

  test('shows the delivered total and a 7-day chart with the sample label', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Delivered' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Delivered' })).toHaveAttribute('href', '/dashboard?tab=delivered');
    const total = page.getByTestId('delivered-total-card');
    await expect(total.getByText('Sample data')).toBeVisible();
    await expect(total.getByTestId('tile-Delivered')).toContainText('126');
    const trend = page.getByTestId('delivered-trend-card');
    await expect(trend.getByText('Sample data')).toBeVisible();
    await expect(trend.getByRole('img', { name: /^Delivered in the last 7 days\./ })).toBeVisible();
    await expect(trend.locator('[data-bar]')).toHaveCount(7);
    await expect(page.getByTestId('kpi-cards')).toBeHidden();
  });

  test('switches between 7 and 30 days', async ({ page }) => {
    const trend = page.getByTestId('delivered-trend-card');
    await expect(trend.getByRole('link', { name: 'Last 7 days' })).toHaveAttribute('aria-current', 'true');
    await trend.getByRole('link', { name: 'Last 30 days' }).click();
    await expect(page).toHaveURL(/\/dashboard\?tab=delivered&range=30$/);
    await expect(trend.locator('[data-bar]')).toHaveCount(30);
    await expect(trend.getByRole('link', { name: 'Last 30 days' })).toHaveAttribute('aria-current', 'true');
    await expect(trend.getByRole('img', { name: /^Delivered in the last 30 days\./ })).toBeVisible();
    await trend.getByRole('link', { name: 'Last 7 days' }).click();
    await expect(trend.locator('[data-bar]')).toHaveCount(7);
  });

  test('ignores a bad range', async ({ page }) => {
    for (const range of ['FOO', '-1', '14', '']) {
      await page.goto(`/dashboard?tab=delivered&range=${range}`);
      await expect(page.getByTestId('delivered-trend-card').locator('[data-bar]')).toHaveCount(7);
    }
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await page.goto('/dashboard?tab=delivered&range=30');
    await expect(page.getByTestId('delivered-trend-card').locator('[data-bar]')).toHaveCount(30);
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    await expectTapTargets(page, [
      page.getByRole('tab', { name: 'Delivered' }),
      page.getByRole('link', { name: 'Last 7 days' }),
      page.getByRole('link', { name: 'Last 30 days' }),
    ]);
  });
});

const EXPECTED_VALUE_LABELS: Record<string, number> = {
  'Freight spend per day': 6,
  'COD collected per day': 5,
};
const EXPECTED_AXIS_LABELS = 6;

test.describe('revenue tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=revenue');
    await expect(page.getByTestId('revenue-tab-card')).toBeVisible();
  });

  test('shows freight and COD totals that match their charts', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Revenue' })).toHaveAttribute('aria-selected', 'true');
    const card = page.getByTestId('revenue-tab-card');
    await expect(card.getByText('Sample data')).toBeVisible();
    for (const [tile, chart] of [
      ['Freight spend', 'Freight spend per day'],
      ['COD collected', 'COD collected per day'],
    ] as const) {
      await expect(card.getByRole('img', { name: new RegExp(`^${chart}\\.`) })).toBeVisible();
      const cells = await card.getByRole('table', { name: chart }).locator('tbody td').allInnerTexts();
      expect(cells).toHaveLength(7);
      const sum = cells.reduce((total, cell) => total + parseNumber(cell), 0);
      const text = await card.getByTestId(`tile-${tile}`).innerText();
      expect(text).toContain('₹');
      expect(parseNumber(text.replace(tile, ''))).toBeCloseTo(sum, 2);
    }
  });

  test('keeps wide value labels from overlapping at 30 days', async ({ page }) => {
    await page.goto('/dashboard?tab=revenue&range=30');
    const card = page.getByTestId('revenue-tab-card');
    await expect(card.locator('[data-bar]')).toHaveCount(60);
    for (const chart of ['Freight spend per day', 'COD collected per day']) {
      const svg = card.getByRole('img', { name: new RegExp(`^${chart}\\.`) });
      for (const selector of ['text[data-value-label]', 'text:not([data-value-label])']) {
        await expect(svg.locator(selector)).not.toHaveCount(0);
        await page.evaluate(() => document.fonts.ready);
        // One read for the frame and every label, so they come from the same layout.
        const { frame, boxes } = await svg.evaluate((node, sel) => {
          const rect = (el: Element) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right };
          };
          return { frame: rect(node), boxes: [...node.querySelectorAll(sel)].map(rect) };
        }, selector);
        // From labelStep for 30 bars: freight labels show every 5th bar, COD every 6th, axis every 5th, counting back from the last.
        const expected = selector === 'text[data-value-label]' ? EXPECTED_VALUE_LABELS[chart]! : EXPECTED_AXIS_LABELS;
        expect(boxes.length, `${chart} ${selector} labels`).toBe(expected);
        boxes.sort((a, b) => a.left - b.left);
        for (const [i, box] of boxes.entries()) {
          expect(box.left, `${chart} ${selector} label ${i} left edge`).toBeGreaterThanOrEqual(frame.left);
          expect(box.right, `${chart} ${selector} label ${i} right edge`).toBeLessThanOrEqual(frame.right);
        }
        for (let i = 1; i < boxes.length; i += 1) {
          expect(boxes[i]!.left, `${chart} ${selector} label ${i}`).toBeGreaterThanOrEqual(boxes[i - 1]!.right);
        }
      }
    }
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await page.goto('/dashboard?tab=revenue&range=30');
    await expect(page.getByTestId('revenue-tab-card').locator('[data-bar]')).toHaveCount(60);
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    await expectTapTargets(page, [
      page.getByRole('tab', { name: 'Revenue' }),
      page.getByRole('link', { name: 'Last 7 days' }),
      page.getByRole('link', { name: 'Last 30 days' }),
    ]);
  });
});

test.describe('sms tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard?tab=sms');
    await expect(page.getByTestId('sms-tab-card')).toBeVisible();
  });

  test('shows the tiles, the sample label and a chart by shipment status', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'SMS' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'SMS' })).toHaveAttribute('href', '/dashboard?tab=sms');
    const card = page.getByTestId('sms-tab-card');
    await expect(card.getByText('Sample data')).toBeVisible();
    await expect(card.getByTestId('tile-Sent')).toContainText('236');
    await expect(card.getByTestId('tile-Delivered')).toContainText('229');
    await expect(card.getByTestId('tile-Failed')).toContainText('7');
    await expect(card.getByTestId('tile-Delivery rate')).toContainText('97.0%');
    await expect(card.getByRole('img', { name: /^Messages by shipment status\./ })).toBeVisible();
    await expect(card.locator('[data-bar]')).toHaveCount(6);
  });

  test('switches to 30 days', async ({ page }) => {
    await page.getByRole('link', { name: 'Last 30 days' }).click();
    await expect(page).toHaveURL(/\/dashboard\?tab=sms&range=30$/);
    const card = page.getByTestId('sms-tab-card');
    await expect(card.getByTestId('tile-Sent')).toContainText('1,000');
    await expect(card.getByTestId('tile-Delivery rate')).toContainText('98.0%');
  });

  test('links to buyer notification settings', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Manage buyer notifications' });
    await expect(link).toHaveAttribute('href', '/settings/notifications');
  });

  test('opens buyer notification settings', async ({ page }) => {
    await page.getByRole('link', { name: 'Manage buyer notifications' }).click();
    await expect(page).toHaveURL(/\/settings\/notifications$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Buyer notifications' })).toBeVisible();
  });

  test('does not scroll sideways at any size', async ({ page }) => {
    await page.goto('/dashboard?tab=sms&range=30');
    await expect(page.getByTestId('sms-tab-card').locator('[data-bar]')).toHaveCount(6);
    await expectNoSidewaysScroll(page, SIZES);
  });

  test('keeps tap targets touch-sized on phones', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    await expectTapTargets(page, [
      page.getByRole('tab', { name: 'SMS' }),
      page.getByRole('link', { name: 'Last 7 days' }),
      page.getByRole('link', { name: 'Last 30 days' }),
      page.getByRole('link', { name: 'Manage buyer notifications' }),
    ]);
  });
});
