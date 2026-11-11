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

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.save.mockReset();
});

describe('saveNotificationsAction', () => {
  it('refuses a signed-out caller before touching the service', async () => {
    session.current = null;
    expect(await saveNotificationsAction(await sample())).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.save).not.toHaveBeenCalled();
  });

  it('validates on the server, naming the unknown variable', async () => {
    const settings = await sample();
    settings.templates.DELIVERED = 'Hi {{x}}';
    const result = await saveNotificationsAction(settings);
    expect(result).toMatchObject({ ok: false, message: 'Unknown variable: {{x}}' });
    expect(service.save).not.toHaveBeenCalled();
  });

  it('saves valid settings', async () => {
    const settings = await sample();
    service.save.mockResolvedValue({ ok: true, source: 'mock', data: settings });
    expect(await saveNotificationsAction(settings)).toEqual({ ok: true, message: 'Notification settings saved.' });
    expect(service.save).toHaveBeenCalledWith(settings);
  });

  it('reports a service failure', async () => {
    service.save.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    });
    expect(await saveNotificationsAction(await sample())).toEqual({
      ok: false,
      message: 'This data is not available yet.',
    });
  });
});
