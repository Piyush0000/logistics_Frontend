import { beforeEach, describe, expect, it, vi } from 'vitest';

const signedIn = vi.hoisted(() => ({ current: true }));

vi.mock('@/lib/admin/session', () => ({
  requireAdminSession: async () => {
    if (!signedIn.current) throw new Error('redirect:/admin/login');
    return { email: 'admin@evocships.test' };
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { adminSystemService } from '@/lib/admin/data/system';
import { DEFAULT_AUDIT_FILTERS } from '@/lib/admin/data/system/audit-filters';
import { retryWebhookAction, type RetryState } from './actions';

const IDLE: RetryState = { status: 'idle' };
const form = (id: string) => {
  const data = new FormData();
  data.set('id', id);
  return data;
};

async function newestAudit() {
  const result = await adminSystemService().listAuditLog(DEFAULT_AUDIT_FILTERS);
  if (!result.ok) throw new Error(result.error.message);
  return result.data.page.items[0]!;
}

beforeEach(() => {
  signedIn.current = true;
  delete (globalThis as { evocMockAdminSystem?: unknown }).evocMockAdminSystem;
});

describe('retryWebhookAction', () => {
  it('refuses a signed-out caller', async () => {
    signedIn.current = false;
    await expect(retryWebhookAction(IDLE, form('whd_1b7c'))).rejects.toThrow('redirect:/admin/login');
  });

  it('queues the delivery and writes it to the audit log', async () => {
    expect(await retryWebhookAction(IDLE, form('whd_1b7c'))).toEqual({
      status: 'queued',
      message: 'Queued. It goes out with the next send.',
    });
    expect(await newestAudit()).toMatchObject({
      action: 'Webhook retried',
      target: 'mer_003 · UrbanThread Apparel',
      detail: 'shipment.delivered delivery whd_1b7c queued to be sent again after 8 failed attempts.',
    });
  });

  it('refuses a second retry, a deleted webhook and an unknown delivery, auditing none', async () => {
    await retryWebhookAction(IDLE, form('whd_1b7c'));
    const before = (await newestAudit()).id;
    expect(await retryWebhookAction(IDLE, form('whd_1b7c'))).toEqual({
      status: 'error',
      message: 'This delivery is already queued to be sent again.',
    });
    expect(await retryWebhookAction(IDLE, form('whd_4e08'))).toMatchObject({ status: 'error' });
    expect(await retryWebhookAction(IDLE, form('whd_nope'))).toEqual({ status: 'error', message: 'That delivery does not exist.' });
    expect((await newestAudit()).id).toBe(before);
  });
});
