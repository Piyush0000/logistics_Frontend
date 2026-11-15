import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

import { submitNdrAction } from './actions';

function form() {
  const data = new FormData();
  data.set('ndr_id', 'ndr-1');
  data.set('action', 'RTO');
  return data;
}

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
});
afterEach(() => {
  delete process.env.DATA_SOURCE_NDR;
});

describe('submitNdrAction', () => {
  it('refuses a signed-out caller', async () => {
    session.current = null;
    await expect(submitNdrAction({ ok: false }, form())).rejects.toThrow('redirect:/login');
  });

  it('refuses to act in gateway mode, with the unavailable message', async () => {
    process.env.DATA_SOURCE_NDR = 'gateway';
    expect(await submitNdrAction({ ok: false }, form())).toEqual({
      ok: false,
      message: 'This data is not available yet.',
    });
  });
});
