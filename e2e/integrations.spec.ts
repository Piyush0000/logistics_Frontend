import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';

const PATH = '/channel-integrations';
const URL_ERROR = 'Enter a public HTTPS address, such as https://your-app.com/webhooks.';

// Desktop and phone runs share one sample store, so every test uses its own address.
const uniqueUrl = () => `https://hooks.example.com/test-${randomUUID()}`;

const row = (page: Page, url: string) => page.getByTestId('webhook-row').filter({ hasText: url });

async function open(page: Page, path = PATH) {
  await signIn(page);
  await page.goto(path, { waitUntil: 'networkidle' });
}

async function createWebhook(page: Page, url: string) {
  await page.getByRole('button', { name: 'Create Webhook' }).click();
  const form = page.getByRole('dialog', { name: 'Create Webhook' });
  await form.getByLabel('Webhook URL').fill(url);
  await form.getByRole('switch', { name: 'shipment.created' }).check();
  await form.getByRole('button', { name: 'Create', exact: true }).click();
  const secret = page.getByRole('dialog', { name: 'Save your signing secret' });
  await expect(secret).toBeVisible();
  return secret;
}

async function createAndDismiss(page: Page, url: string) {
  const secret = await createWebhook(page, url);
  await secret.getByRole('button', { name: 'Done' }).click();
  await expect(row(page, url)).toBeVisible();
}

test('sends signed-out visitors to login', async ({ page }) => {
  await page.goto(PATH);

  await expect(page).toHaveURL(/\/login/);
});

test.describe('page', () => {
  test('opens on webhooks, labelled as sample data', async ({ page }) => {
    await open(page);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Channel Integrations');
    await expect(page.getByRole('link', { name: 'Webhooks' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    for (const id of ['webhooks-card', 'deliveries-card']) {
      await expect(page.getByTestId(id).getByText('Sample data')).toBeVisible();
    }
    await expect(row(page, 'demo-orders')).toContainText('shipment.created');
    await expect(row(page, 'demo-orders')).toContainText('Active');
    await expect(row(page, 'demo-alerts')).toContainText('Paused');
  });

  test('explains the real signature, not the one in the reference', async ({ page }, testInfo) => {
    await open(page);
    if (testInfo.project.name === 'phone') {
      await page.getByRole('button', { name: 'Webhook Information' }).click();
    }
    const info = page.getByTestId('webhook-info');

    for (const text of [
      'X-LogiCore-Signature',
      'X-LogiCore-Timestamp',
      'X-LogiCore-Event-Id',
      'shipment.created',
      'shipment.status.updated',
      'shipment.failed',
    ]) {
      await expect(info.getByText(text, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText('X-Webhook-Signature')).toHaveCount(0);
    await expect(page.getByText('order.created')).toHaveCount(0);
  });

  test('offers no API keys, rather than fake ones', async ({ page }) => {
    await open(page);

    await page.getByRole('link', { name: 'API Keys' }).click();

    await expect(page).toHaveURL(/tab=api-keys/);
    await expect(page.getByText('API keys are not available yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create API Key' })).toBeDisabled();
    await expect(page.getByTestId('webhooks-card')).toHaveCount(0);
  });

  test('shows a sample payload for each event', async ({ page }, testInfo) => {
    await open(page);
    if (testInfo.project.name === 'phone') {
      await page.getByRole('button', { name: 'Webhook Information' }).click();
    }

    await page.getByRole('button', { name: 'View Sample Payloads' }).click();
    const payloads = page.getByRole('dialog', { name: 'Sample Payloads' });

    for (const event of ['shipment.created', 'shipment.status.updated', 'shipment.failed']) {
      await expect(payloads.getByRole('heading', { name: event })).toBeVisible();
    }

    await payloads.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(payloads).toBeHidden();
  });
});

test.describe('event payloads', () => {
  const showInfo = async (page: Page, project: string) => {
    if (project === 'phone') {
      await page.getByRole('button', { name: 'Webhook Information' }).click();
    }
  };

  test('opens an available event and moves between events', async ({ page }, testInfo) => {
    await open(page);
    await showInfo(page, testInfo.project.name);

    await page
      .getByTestId('webhook-info')
      .getByRole('button', { name: 'shipment.status.updated', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Sample Payloads' });

    await expect(dialog.getByText('Event: shipment.status.updated')).toBeVisible();
    await expect(dialog.getByText('"type": "shipment.status.updated"')).toBeVisible();

    await dialog.getByRole('button', { name: 'shipment.failed', exact: true }).click();
    await expect(dialog.getByText('Event: shipment.failed')).toBeVisible();
    await expect(dialog.getByText('"type": "shipment.failed"')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'shipment.failed', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('opens one event from the full list', async ({ page }, testInfo) => {
    await open(page);
    await showInfo(page, testInfo.project.name);

    await page.getByRole('button', { name: 'View Sample Payloads' }).click();
    const dialog = page.getByRole('dialog', { name: 'Sample Payloads' });
    await dialog.getByRole('button', { name: 'View Details of shipment.created' }).click();

    await expect(dialog.getByText('Event: shipment.created')).toBeVisible();
  });

  test('copies the event on screen', async ({ page, context }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    await showInfo(page, testInfo.project.name);

    await page
      .getByTestId('webhook-info')
      .getByRole('button', { name: 'shipment.failed', exact: true })
      .click();
    await page.getByRole('button', { name: 'Copy Payload' }).click();

    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(JSON.parse(copied)).toMatchObject({ type: 'shipment.failed' });
  });
});

test.describe('creating', () => {
  test('explains bad input and keeps the form open', async ({ page }) => {
    await open(page);

    await page.getByRole('button', { name: 'Create Webhook' }).click();
    const form = page.getByRole('dialog', { name: 'Create Webhook' });
    await form.getByLabel('Webhook URL').fill('http://localhost/in');
    await form.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(form.getByText(URL_ERROR)).toBeVisible();
    await expect(form.getByText('Choose at least one event.')).toBeVisible();
    await expect(form.getByLabel('Webhook URL')).toHaveAttribute('aria-invalid', 'true');
  });

  test('has no name field or active switch, which the backend cannot store', async ({ page }) => {
    await open(page);

    await page.getByRole('button', { name: 'Create Webhook' }).click();
    const form = page.getByRole('dialog', { name: 'Create Webhook' });

    await expect(form.getByLabel('Name')).toHaveCount(0);
    await expect(form.getByRole('switch', { name: 'Active' })).toHaveCount(0);
    await expect(form.getByRole('switch')).toHaveCount(3);
  });

  test('shows the secret once, and never again', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await open(page);
    const url = uniqueUrl();

    const dialog = await createWebhook(page, url);
    const secret = (await dialog.getByTestId('signing-secret').textContent()) ?? '';
    expect(secret).toMatch(/^whsec_sample_/);
    await expect(dialog.getByText('You will not see it again.')).toBeVisible();

    await dialog.getByRole('button', { name: 'Copy secret' }).click();
    await expect(dialog.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(secret);

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(row(page, url)).toBeVisible();
    await expect(page.getByText(secret)).toHaveCount(0);

    await page.reload({ waitUntil: 'networkidle' });
    await expect(row(page, url)).toBeVisible();
    expect(await page.content()).not.toContain(secret);
  });
});

test.describe('changing', () => {
  test('edits a webhook, starting from its current values', async ({ page }) => {
    await open(page);
    const url = uniqueUrl();
    const changed = uniqueUrl();
    await createAndDismiss(page, url);

    await page.getByRole('button', { name: `Edit ${url}` }).click();
    const form = page.getByRole('dialog', { name: 'Edit Webhook' });
    await expect(form.getByLabel('Webhook URL')).toHaveValue(url);
    await expect(form.getByRole('switch', { name: 'shipment.created' })).toBeChecked();

    await form.getByLabel('Webhook URL').fill(changed);
    await form.getByRole('switch', { name: 'shipment.failed' }).check();
    await form.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(form).toBeHidden();
    await expect(row(page, changed)).toContainText('shipment.failed');
    await expect(row(page, url)).toHaveCount(0);
  });

  test('asks before deleting, and Cancel keeps the webhook', async ({ page }) => {
    await open(page);
    const url = uniqueUrl();
    await createAndDismiss(page, url);

    await page.getByRole('button', { name: `Delete ${url}` }).click();
    const confirm = page.getByRole('dialog', { name: 'Delete Webhook' });
    await expect(confirm).toContainText(url);

    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(row(page, url)).toBeVisible();

    await page.getByRole('button', { name: `Delete ${url}` }).click();
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(confirm).toBeHidden();
    await expect(row(page, url)).toHaveCount(0);
  });

  test('closes a popup on Escape and returns focus', async ({ page }) => {
    await open(page);

    const button = page.getByRole('button', { name: 'Create Webhook' });
    await button.click();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(button).toBeFocused();
  });
});

test.describe('delivery history', () => {
  const deliveries = (page: Page) => page.getByTestId('delivery-row');

  test('shows outcomes, and offers Retry only on failures', async ({ page }) => {
    await open(page);

    await expect(deliveries(page)).toHaveCount(10);
    const failed = deliveries(page).filter({ hasText: 'Failed' }).first();
    await expect(failed).toContainText('HTTP 500');
    await expect(failed).toContainText('3 attempts');
    await expect(failed.getByRole('button', { name: 'Retry' })).toBeVisible();

    const delivered = deliveries(page).filter({ hasText: 'Delivered' }).first();
    await expect(delivered.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  });

  test('moves to older entries and back', async ({ page }) => {
    await open(page);

    await page.getByRole('link', { name: 'Older deliveries' }).click();
    await expect(deliveries(page)).toHaveCount(3);
    await expect(page.getByRole('link', { name: 'Older deliveries' })).toHaveCount(0);

    await page.getByRole('link', { name: 'Newest deliveries' }).click();
    await expect(deliveries(page)).toHaveCount(10);
  });

  test('ignores a nonsense position in the URL', async ({ page }) => {
    await open(page, `${PATH}?cursor=nonsense`);

    await expect(deliveries(page)).toHaveCount(10);
  });
});

test.describe('layout', () => {
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [390, 844],
    [844, 390],
    [768, 1024],
    [1024, 768],
    [1280, 800],
    [1366, 768],
    [1920, 1080],
  ] as const) {
    test(`does not scroll sideways at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await open(page);
      const overflow = () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );

      expect(await overflow()).toBeLessThanOrEqual(0);

      await page.getByRole('button', { name: 'Create Webhook' }).click();
      const dialog = await page.getByRole('dialog', { name: 'Create Webhook' }).boundingBox();
      expect((dialog?.x ?? -1) >= 0).toBe(true);
      expect((dialog?.x ?? 0) + (dialog?.width ?? 0)).toBeLessThanOrEqual(width);
    });
  }

  test('puts the information below the list and folds it on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await open(page);
    const toggle = page.getByRole('button', { name: 'Webhook Information' });

    await expect(page.getByRole('button', { name: 'View Sample Payloads' })).toBeHidden();
    await toggle.click();
    await expect(page.getByRole('button', { name: 'View Sample Payloads' })).toBeVisible();

    const list = await page.getByTestId('webhooks-card').boundingBox();
    const info = await toggle.boundingBox();
    expect(info?.y ?? 0).toBeGreaterThan(list?.y ?? Infinity);
  });

  test('keeps every tap target at least 44px tall on phones', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone', 'Phone layout only');
    await open(page);

    for (const target of [
      page.getByRole('link', { name: 'Webhooks' }),
      page.getByRole('link', { name: 'API Keys' }),
      page.getByRole('button', { name: 'Create Webhook' }),
      page.getByRole('button', { name: 'Edit https://hooks.example.com/demo-orders' }),
      page.getByRole('button', { name: 'Delete https://hooks.example.com/demo-orders' }),
      page.getByRole('button', { name: 'Webhook Information' }),
      page.getByRole('button', { name: 'Retry' }).first(),
    ]) {
      expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }

    await page.getByRole('button', { name: 'Create Webhook' }).click();
    const form = page.getByRole('dialog', { name: 'Create Webhook' });
    for (const target of [
      form.getByLabel('Webhook URL'),
      form.getByTestId('event-shipment.created'),
      form.getByRole('button', { name: 'Create', exact: true }),
      form.getByRole('button', { name: 'Cancel' }),
    ]) {
      expect((await target.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
