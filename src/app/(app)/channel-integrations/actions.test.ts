import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  retryDelivery: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/webhooks', () => ({ webhookService: () => service }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
  createWebhookAction,
  deleteWebhookAction,
  retryDeliveryAction,
  updateWebhookAction,
} from './actions';

const input = { url: 'https://hooks.example.com/in', events: ['shipment.created'] };
const id = '10000000-0000-4000-8000-000000000001';

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  for (const method of Object.values(service)) method.mockReset();
});

describe('signed out', () => {
  it('refuses every action before touching the service', async () => {
    session.current = null;

    for (const result of [
      await createWebhookAction(input),
      await updateWebhookAction(id, input),
      await deleteWebhookAction(id),
      await retryDeliveryAction(id),
    ]) {
      expect(result).toEqual({ ok: false, message: 'Sign in again to continue.' });
    }
    for (const method of Object.values(service)) expect(method).not.toHaveBeenCalled();
  });
});

describe('createWebhookAction', () => {
  it('checks the input before calling the service', async () => {
    const result = await createWebhookAction({ url: 'http://x.example.com', events: [] });

    expect(result.ok).toBe(false);
    expect(result).toHaveProperty('fieldErrors.url');
    expect(result).toHaveProperty('fieldErrors.events');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('returns the secret once', async () => {
    service.create.mockResolvedValue({ ok: true, source: 'mock', data: { secret: 'whsec_x' } });

    expect(await createWebhookAction(input)).toEqual({
      ok: true,
      data: { secret: 'whsec_x' },
    });
  });

  it('turns backend field problems into field errors', async () => {
    service.create.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: {
        kind: 'validation',
        status: 400,
        message: 'Some fields need attention.',
        issues: [{ path: 'url', message: 'url must be public' }],
      },
    });

    expect(await createWebhookAction(input)).toEqual({
      ok: false,
      message: 'Some fields need attention.',
      fieldErrors: { url: 'url must be public' },
    });
  });

  it('asks the merchant to sign in again when the key is refused', async () => {
    service.create.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'unauthorized', status: 401, message: 'Unauthorized' },
    });

    expect(await createWebhookAction(input)).toEqual({
      ok: false,
      message: 'Sign in again to continue.',
    });
  });
});

describe('ids', () => {
  it('refuses a malformed id', async () => {
    for (const result of [
      await updateWebhookAction('../x', input),
      await deleteWebhookAction('../x'),
      await retryDeliveryAction('../x'),
    ]) {
      expect(result.ok).toBe(false);
    }
    expect(service.update).not.toHaveBeenCalled();
    expect(service.remove).not.toHaveBeenCalled();
    expect(service.retryDelivery).not.toHaveBeenCalled();
  });
});

describe('other actions', () => {
  it('updates, deletes and retries', async () => {
    const done = { ok: true, source: 'mock', data: undefined };
    service.update.mockResolvedValue(done);
    service.remove.mockResolvedValue(done);
    service.retryDelivery.mockResolvedValue(done);

    expect((await updateWebhookAction(id, input)).ok).toBe(true);
    expect((await deleteWebhookAction(id)).ok).toBe(true);
    expect((await retryDeliveryAction(id)).ok).toBe(true);
    expect(service.update).toHaveBeenCalledWith(id, input);
  });

  it('explains a retry the backend refuses', async () => {
    service.retryDelivery.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'conflict', status: 409, message: 'Delivery is already queued' },
    });

    expect(await retryDeliveryAction(id)).toEqual({
      ok: false,
      message: 'Delivery is already queued',
    });
  });
});
