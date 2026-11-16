import { expect, test } from '@playwright/test';
import { signInAdmin } from './admin-helpers';

test.describe('admin support', () => {
  test.beforeEach(async ({ page }) => {
    await signInAdmin(page);
  });

  test('redirects unauthenticated visits to login', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/admin/support');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('displays support inbox with tabs and responsive layout', async ({ page }, testInfo) => {
    await page.goto('/admin/support');
    await expect(page.getByRole('heading', { level: 1, name: 'Support' })).toBeVisible();

    // Check status tabs
    await expect(page.getByTestId('admin-support-tab-open')).toBeVisible();
    await expect(page.getByTestId('admin-support-tab-awaiting_merchant')).toBeVisible();
    await expect(page.getByTestId('admin-support-tab-resolved')).toBeVisible();
    await expect(page.getByTestId('admin-support-tab-all')).toBeVisible();

    if (testInfo.project.name === 'phone') {
      await expect(page.getByTestId('admin-ticket-card').first()).toBeVisible();
    } else {
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByTestId('admin-ticket-row').first()).toBeVisible();
    }
  });

  test('switches status tabs', async ({ page }, testInfo) => {
    await page.goto('/admin/support');
    const cardOrRow = testInfo.project.name === 'phone' ? 'admin-ticket-card' : 'admin-ticket-row';

    // Click Resolved tab
    await page.getByTestId('admin-support-tab-resolved').click();
    await expect(page).toHaveURL(/status=resolved/);
    await expect(page.getByTestId(cardOrRow).getByText('Resolved').first()).toBeVisible();

    // Click All tickets tab
    await page.getByTestId('admin-support-tab-all').click();
    await expect(page.getByTestId(cardOrRow).first()).toBeVisible();

    // Click Open tab
    await page.getByTestId('admin-support-tab-open').click();
    await expect(page).toHaveURL(/status=open/);
    await expect(page.getByTestId(cardOrRow).getByText('Open').first()).toBeVisible();
  });

  test('filters tickets by priority dropdown', async ({ page }, testInfo) => {
    await page.goto('/admin/support');
    const cardOrRow = testInfo.project.name === 'phone' ? 'admin-ticket-card' : 'admin-ticket-row';

    const prioSelect = page.getByTestId('admin-support-priority-filter');
    await prioSelect.selectOption('high');
    await expect(page).toHaveURL(/priority=high/);

    // Should only see High priority tickets
    const rows = page.getByTestId(cardOrRow);
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).getByText('High')).toBeVisible();
    }
  });

  test('filters tickets dynamically by search input', async ({ page }, testInfo) => {
    await page.goto('/admin/support');
    const cardOrRow = testInfo.project.name === 'phone' ? 'admin-ticket-card' : 'admin-ticket-row';

    const searchInput = page.getByTestId('admin-support-search');
    await searchInput.fill('TK-2041');

    await expect(page.getByTestId(cardOrRow).getByText('TK-2041')).toBeVisible();

    // Search nonexistent query
    await searchInput.fill('completely-nonexistent-ticket-subject-12345');
    await expect(page.getByText('No tickets found matching your filters.')).toBeVisible();
  });

  test('navigates to ticket detail page and renders thread', async ({ page }) => {
    await page.goto('/admin/support/TK-2041');
    await expect(page.getByRole('heading', { level: 1, name: /COD payout for 3 Nov not received/i })).toBeVisible();
    await expect(page.getByText('TK-2041')).toBeVisible();

    // Merchant details card
    await expect(page.getByTestId('admin-ticket-merchant-name')).toHaveText('UrbanThread Apparel');
    await expect(page.getByRole('link', { name: /View merchant profile/i })).toHaveAttribute(
      'href',
      '/admin/merchants/mer_003',
    );

    // Thread messages
    await expect(page.getByTestId('ticket-thread')).toBeVisible();
    await expect(page.getByText('Hi team, our COD remittance for deliveries completed on 3 Nov')).toBeVisible();
  });

  test('posts a reply and displays it in thread', async ({ page }) => {
    await page.goto('/admin/support/TK-2039');
    await expect(page.getByTestId('ticket-thread')).toBeVisible();

    const testReply = `Playwright automated test response ${Date.now()}`;
    const textarea = page.getByTestId('admin-ticket-reply-textarea');
    await textarea.fill(testReply);

    await page.getByTestId('admin-ticket-reply-submit').click();

    // Should display success message and reply inside thread
    await expect(page.getByTestId('admin-ticket-reply-success')).toBeVisible();
    await expect(page.getByTestId('ticket-thread').getByText(testReply)).toBeVisible();
  });

  test('reopens a resolved ticket upon reply', async ({ page }) => {
    await page.goto('/admin/support/TK-2011');
    
    // Ensure ticket is in resolved status via controls
    const statusSelect = page.getByTestId('admin-ticket-status-select');
    await statusSelect.selectOption('resolved');
    await expect(page.getByTestId('admin-ticket-status-chip')).toHaveText('Resolved');

    const textarea = page.getByTestId('admin-ticket-reply-textarea');
    await textarea.fill('Reopening this ticket to verify courier update.');
    await page.getByTestId('admin-ticket-reply-submit').click();

    await expect(page.getByTestId('admin-ticket-reply-success')).toBeVisible();
    await expect(page.getByText('Reply sent! Ticket has been reopened.')).toBeVisible();
    await expect(page.getByTestId('admin-ticket-status-chip')).toHaveText('Open');
  });

  test('answers 404 for unknown ticket ID', async ({ page }) => {
    const res = await page.goto('/admin/support/TK-9999');
    expect(res?.status()).toBe(404);
    await expect(page.getByText(/could not find the requested ticket|not found/i)).toBeVisible();
  });

  test('captures screenshots for documentation', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'desktop') {
      await page.goto('/admin/support');
      await page.screenshot({
        path: 'C:/Users/toufe/.gemini/antigravity/brain/5ff952c9-83c2-4b52-99ad-f9b68153f333/verified_support_inbox.png',
      });

      await page.goto('/admin/support/TK-2041');
      await page.screenshot({
        path: 'C:/Users/toufe/.gemini/antigravity/brain/5ff952c9-83c2-4b52-99ad-f9b68153f333/verified_support_detail.png',
      });
    }

    if (testInfo.project.name === 'phone') {
      await page.goto('/admin/support');
      await page.screenshot({
        path: 'C:/Users/toufe/.gemini/antigravity/brain/5ff952c9-83c2-4b52-99ad-f9b68153f333/verified_support_mobile.png',
      });
    }
  });
});
