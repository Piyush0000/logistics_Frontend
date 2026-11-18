import { expect, test, type Page } from '@playwright/test';
import { signInAdmin } from './admin-helpers';

const SYSTEM = '/admin/system';

const audit = (page: Page) => page.getByTestId('admin-audit');
const entries = (page: Page) => page.getByTestId('admin-audit-entry');
const picker = (page: Page, name: string) => audit(page).getByRole('button', { name: new RegExp(name) });

async function open(page: Page, path = SYSTEM) {
  await signInAdmin(page);
  await page.goto(path, { waitUntil: 'networkidle' });
}

test('sends a signed-out visitor to the admin sign-in', async ({ page }) => {
  await page.goto(`${SYSTEM}?action=Wallet+credit`);

  await expect(page).toHaveURL(/\/admin\/login$/);
});

test.describe('audit log', () => {
  test('shows the newest entries first, labelled sample, in pages', async ({ page }) => {
    await open(page);

    await expect(audit(page).getByText('Sample data')).toBeVisible();
    await expect(entries(page)).toHaveCount(10);
    await expect(audit(page).getByTestId('pagination')).toContainText('Page 1 of');

    await audit(page).getByRole('link', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(entries(page).first()).toBeVisible();
  });

  test('filters by action, and keeps the filter on the next page', async ({ page }) => {
    await open(page);

    await picker(page, 'Action').click();
    await page.getByRole('option', { name: 'Wallet credit', exact: true }).click();
    await audit(page).getByRole('button', { name: 'Apply' }).click();

    await expect(page).toHaveURL(/action=Wallet\+credit/);
    await expect(entries(page).first()).toBeVisible();
    for (const text of await entries(page).allInnerTexts()) {
      expect(text).toContain('Wallet credit');
    }
    await expect(picker(page, 'Action')).toContainText('Wallet credit');
  });

  test('explains when nothing matches', async ({ page }) => {
    await open(page, `${SYSTEM}?from=2020-01-01&to=2020-01-31`);

    await expect(audit(page).getByText('No admin changes match these filters.')).toBeVisible();
    await expect(audit(page).getByTestId('pagination')).toHaveCount(0);
  });

  test('ignores a backwards date range in the URL, and says so', async ({ page }) => {
    await open(page, `${SYSTEM}?from=2026-11-15&to=2026-11-01`);

    await expect(audit(page).getByTestId('audit-notice')).toHaveText(
      'The dates were ignored, because To Date was before From Date.',
    );
    await expect(entries(page)).toHaveCount(10);
  });

  test('ignores nonsense in the URL instead of failing', async ({ page }) => {
    const response = await page.goto(SYSTEM);
    expect(response?.status()).toBe(200);
    await open(page, `${SYSTEM}?action=Not+an+action&from=soon&to=2026-02-31&page=-4`);

    await expect(entries(page)).toHaveCount(10);
    await expect(picker(page, 'Action')).toContainText('All actions');
  });

  test('stops a backwards range before sending it', async ({ page }) => {
    await open(page, `${SYSTEM}?from=2026-11-10&to=2026-11-12`);

    await picker(page, 'To Date').click();
    await page.getByRole('button', { name: '05/11/2026' }).click();
    await audit(page).getByRole('button', { name: 'Apply' }).click();

    await expect(audit(page).getByTestId('filter-error')).toHaveText(
      'From Date must be on or before To Date.',
    );
    await expect(page).toHaveURL(/to=2026-11-12/);
  });

  test('clears the filters', async ({ page }) => {
    await open(page, `${SYSTEM}?action=Wallet+credit&page=1`);

    await audit(page).getByRole('link', { name: 'Clear' }).click();

    await expect(page).toHaveURL(new RegExp(`${SYSTEM}$`));
    await expect(picker(page, 'Action')).toContainText('All actions');
  });
});

test('answers 404 for a System page that does not exist', async ({ page }) => {
  await signInAdmin(page);
  const response = await page.goto(`${SYSTEM}/no-such-page`);
  expect(response?.status()).toBe(404);
});

test.describe('service health', () => {
  test('shows "No answer" for a service that did not reply, and Refresh checks again', async ({ page }) => {
    await open(page);
    const health = page.getByTestId('admin-health');

    await expect(health.getByTestId('admin-service').filter({ hasText: 'adapters' }).getByTestId('health-no-answer')).toHaveText(
      'No answer',
    );
    const before = await health.getByTestId('health-checked').first().innerText();
    // The time shows seconds; wait past the next one.
    await page.waitForTimeout(1100);
    await health.getByRole('button', { name: 'Refresh' }).click();
    await expect(health.getByTestId('health-checked').first()).not.toHaveText(before);
  });
});

// Each project retries its own delivery, so the desktop and phone runs never collide.
const OWN_DELIVERY: Record<string, { id: string; merchant: string }> = {
  desktop: { id: 'whd_0f3a', merchant: 'mer_001' },
  phone: { id: 'whd_2c91', merchant: 'mer_005' },
};

test.describe('failed webhooks', () => {
  test('retries a failed delivery once, updates its row and audits it', async ({ page }, testInfo) => {
    test.slow();
    const own = OWN_DELIVERY[testInfo.project.name] ?? OWN_DELIVERY.desktop!;
    await open(page);
    const kind = testInfo.project.name === 'phone' ? 'admin-webhook-card' : 'admin-webhook-row';
    const row = page.locator(`[data-testid="${kind}"][data-delivery-id="${own.id}"]`);
    const retry = row.getByRole('button', { name: /^Retry/ });

    // A retry on the same server finds it already queued; the checks after this still apply.
    if (await retry.isVisible()) {
      await expect(row.getByTestId('webhook-status')).toHaveText('Failed');
      await retry.click();
      await expect(row.getByTestId('webhook-retry-message')).toHaveText('Queued. It goes out with the next send.');
    }
    await expect(row.getByTestId('webhook-status')).toHaveText('Retry queued');
    await expect(retry).toHaveCount(0);

    await page.goto('/admin/system?action=Webhook+retried', { waitUntil: 'networkidle' });
    await expect(page.getByTestId('admin-audit-entry').filter({ hasText: own.id })).toContainText(own.merchant);
  });

  test('offers no retry for a webhook the merchant deleted', async ({ page }, testInfo) => {
    await open(page);
    const kind = testInfo.project.name === 'phone' ? 'admin-webhook-card' : 'admin-webhook-row';
    const row = page.locator(`[data-testid="${kind}"][data-delivery-id="whd_4e08"]`);
    await expect(row.getByTestId('webhook-status')).toHaveText('Webhook deleted');
    await expect(row.getByRole('button', { name: /^Retry/ })).toHaveCount(0);
  });

  test('shows cards on phones and a table on desktop', async ({ page }, testInfo) => {
    await open(page);
    const phone = testInfo.project.name === 'phone';
    await expect(page.getByTestId('admin-webhook-card').first()).toBeVisible({ visible: phone });
    await expect(page.getByTestId('admin-webhook-row').first()).toBeVisible({ visible: !phone });
  });
});

test.describe('layout', () => {
  for (const [width, height] of [
    [320, 568],
    [768, 1024],
    [1440, 900],
  ] as const) {
    test(`does not scroll sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBeLessThanOrEqual(0);
    });
  }

  test('keeps tap targets at least 44px tall on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await open(page);

    for (const target of [
      picker(page, 'Action'),
      picker(page, 'From Date'),
      picker(page, 'To Date'),
      audit(page).getByRole('button', { name: 'Apply' }),
      audit(page).getByRole('link', { name: 'Clear' }),
      audit(page).getByRole('link', { name: 'Next page' }),
      page.getByTestId('admin-health').getByRole('button', { name: 'Refresh' }),
      page.locator('[data-testid="admin-webhook-card"][data-delivery-id="whd_3d44"]').getByRole('button', { name: /^Retry/ }),
    ]) {
      expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
