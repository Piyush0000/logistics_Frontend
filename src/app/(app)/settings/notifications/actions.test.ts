import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/notifications', async (original) => ({
  ...(await original<typeof import('@/lib/data/notifications')>()),
  notificationService: () => service,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createMockNotificationService } from '@/lib/data/notifications/mock';
import { saveNotificationsAction } from './actions';

async function sample() {
  const result = await createMockNotificationService().get();
  if (!result.ok) throw new Error('sample failed');
  return result.data;
}

/** Wires the mocked service to a real in-memory one. */
function useRealStore() {
  const store = createMockNotificationService();
  service.get.mockImplementation(() => store.get());
  service.save.mockImplementation((s) => store.save(s));
  return store;
}

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.get.mockReset();
  service.save.mockReset();
});

describe('saveNotificationsAction', () => {
  it('refuses a signed-out caller before touching the service', async () => {
    session.current = null;
    expect(await saveNotificationsAction({ events: {} })).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.get).not.toHaveBeenCalled();
    expect(service.save).not.toHaveBeenCalled();
  });

  it('refuses input that is not a change', async () => {
    useRealStore();
    for (const input of [null, 'x', {}, { events: { DELIVERED: { template: 5 } } }]) {
      expect((await saveNotificationsAction(input)).ok).toBe(false);
    }
    expect(service.save).not.toHaveBeenCalled();
  });

  it('validates the merged message on the server, naming the unknown variable', async () => {
    useRealStore();
    const result = await saveNotificationsAction({ events: { DELIVERED: { template: 'Hi {{x}}' } } });
    expect(result).toMatchObject({ ok: false, message: 'Unknown variable: {{x}}', errors: { DELIVERED: 'Unknown variable: {{x}}' } });
    expect(service.save).not.toHaveBeenCalled();
  });

  it('keeps both changes when two saves touch different events', async () => {
    const store = useRealStore();
    const before = await sample();
    // Both callers started from the same page, so each sends only its own event.
    const [a, b] = await Promise.all([
      saveNotificationsAction({ events: { DELIVERED: { matrix: { email: !before.matrix.DELIVERED.email } } } }),
      saveNotificationsAction({ events: { IN_TRANSIT: { template: 'Parcel {{awb}} is moving.' } } }),
    ]);
    expect(a.ok && b.ok).toBe(true);

    const after = await store.get();
    if (!after.ok) throw new Error('get failed');
    expect(after.data.matrix.DELIVERED.email).toBe(!before.matrix.DELIVERED.email);
    expect(after.data.templates.IN_TRANSIT).toBe('Parcel {{awb}} is moving.');
    // Everything neither save touched is unchanged.
    expect(after.data.templates.DELIVERED).toBe(before.templates.DELIVERED);
    expect(after.data.matrix.MANIFESTED).toEqual(before.matrix.MANIFESTED);
  });

  it('changes only the named channels of an event', async () => {
    const store = useRealStore();
    const before = await sample();
    await saveNotificationsAction({ events: { DELIVERED: { matrix: { whatsapp: true } } } });
    const after = await store.get();
    if (!after.ok) throw new Error('get failed');
    expect(after.data.matrix.DELIVERED).toEqual({ ...before.matrix.DELIVERED, whatsapp: true });
  });

  it('returns the saved settings', async () => {
    useRealStore();
    const result = await saveNotificationsAction({ events: { DELIVERED: { template: 'Done: {{awb}}' } } });
    expect(result).toMatchObject({ ok: true, message: 'Notification settings saved.' });
    expect(result.ok && result.settings.templates.DELIVERED).toBe('Done: {{awb}}');
  });

  it('reports a service failure', async () => {
    const failure = {
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    };
    service.get.mockResolvedValue(failure);
    expect(await saveNotificationsAction({ events: {} })).toEqual({
      ok: false,
      message: 'This data is not available yet.',
    });
    expect(service.save).not.toHaveBeenCalled();
  });
});
