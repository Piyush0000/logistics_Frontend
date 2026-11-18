import { expect, test } from '@playwright/test';
import { signInAdmin } from './admin-helpers';

test.describe('admin onboarding and kyc', () => {
  test.beforeEach(async ({ page }) => {
    await signInAdmin(page);
  });

  test('redirects unauthenticated visits to login', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/admin/onboarding');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('displays applications list with status tabs and default pending selection', async ({ page }, testInfo) => {
    await page.goto('/admin/onboarding');
    await expect(page.getByRole('heading', { level: 1, name: 'Onboarding & KYC' })).toBeVisible();

    const pendingTab = page.getByTestId('admin-onboarding-tab-pending');
    await expect(pendingTab).toBeVisible();
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');

    // The list itself is checked on the All tab: the decision test may empty Pending at any moment.
    await page.getByTestId('admin-onboarding-tab-all').click();
    if (testInfo.project.name === 'phone') {
      await expect(page.getByTestId('admin-onboarding-mobile')).toBeVisible();
      await expect(page.getByTestId('admin-application-card').first()).toBeVisible();
    } else {
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByTestId('admin-application-row').first()).toBeVisible();
    }
  });

  test('filters applications by status tabs', async ({ page }, testInfo) => {
    await page.goto('/admin/onboarding');
    const cardOrRow = testInfo.project.name === 'phone' ? 'admin-application-card' : 'admin-application-row';

    // Click Approved tab
    await page.getByTestId('admin-onboarding-tab-approved').click();
    await expect(page).toHaveURL(/status=approved/);
    await expect(page.getByTestId(cardOrRow).getByText('Pixel Gadgets')).toBeVisible();

    // Click Rejected tab
    await page.getByTestId('admin-onboarding-tab-rejected').click();
    await expect(page).toHaveURL(/status=rejected/);
    await expect(page.getByTestId(cardOrRow).getByText('Quick Mart Traders')).toBeVisible();
  });

  test('filters applications dynamically by search input', async ({ page }, testInfo) => {
    await page.goto('/admin/onboarding');
    const cardOrRow = testInfo.project.name === 'phone' ? 'admin-application-card' : 'admin-application-row';

    const searchInput = page.getByPlaceholder(/Search business, email/i);
    await searchInput.fill('Quick Mart');

    await page.getByTestId('admin-onboarding-tab-all').click();
    await expect(page.getByTestId(cardOrRow).getByText('Quick Mart Traders')).toBeVisible();

    // Clear search with nonexistent query
    await searchInput.fill('nonexistent-merchant-business-xyz-999');
    await expect(page.getByText('No applications found matching your criteria.')).toBeVisible();
  });

  test('answers 404 for an unknown application id', async ({ page }) => {
    const res = await page.goto('/admin/onboarding/app_unknown_99999');
    expect(res?.status()).toBe(404);
  });

  test('renders review page with business details and documents', async ({ page }) => {
    // app_mer_005 is pre-approved
    await page.goto('/admin/onboarding/app_mer_005');
    await expect(page.getByRole('heading', { level: 1, name: 'Pixel Gadgets' })).toBeVisible();

    // Verify business details card
    await expect(page.getByTestId('admin-onboarding-business')).toBeVisible();
    await expect(page.getByText('orders@pixelgadgets.example')).toBeVisible();
    await expect(page.getByText('Delhi')).toBeVisible();

    // Verify documents card
    await expect(page.getByTestId('admin-onboarding-documents')).toBeVisible();
    await expect(page.getByTestId('admin-onboarding-doc-row')).toHaveCount(3);
    await expect(page.getByText('GST Certificate')).toBeVisible();
    await expect(page.getByText('PAN Card')).toBeVisible();
    await expect(page.getByText('Cancelled Cheque')).toBeVisible();

    // Because it is approved, banner is visible
    await expect(page.getByTestId('admin-application-approved-banner')).toBeVisible();
  });

  // Changes shared sample data on the one e2e server, so it runs once (desktop), not in parallel on phone too.
  test('handles decision flows on pending applications', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Changes shared sample data; runs once, on desktop');
    const appId = 'app_mer_006';
    await page.goto(`/admin/onboarding/${appId}`);

    const approveBtn = page.getByTestId('admin-application-approve-button');
    await approveBtn.click();
    const confirmBtn = page.getByRole('dialog').getByRole('button', { name: 'Confirm approval' });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
    await expect(page).toHaveURL(/status=approved/);
  });

  // Changes shared sample data on the one e2e server, so it runs once (desktop), not in parallel on phone too.
  test('validates rejection reason in dialog', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'phone', 'Changes shared sample data; runs once, on desktop');
    const appId = 'app_mer_007';
    await page.goto(`/admin/onboarding/${appId}`);

    const rejectBtn = page.getByTestId('admin-application-reject-button');
    await rejectBtn.click();

    const dialog = page.getByRole('dialog');
    const submitBtn = dialog.getByRole('button', { name: 'Reject application' });
    await expect(submitBtn).toBeDisabled();

    const textarea = dialog.locator('#rejection-reason');
    await textarea.fill('Short');
    await expect(submitBtn).toBeDisabled();

    await textarea.fill('GSTIN certificate is blurry and cannot verify registration.');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    await expect(page).toHaveURL(/status=rejected/);
  });
});
