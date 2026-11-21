import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));
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

  it('shows the reason when the backend refuses the decision in gateway mode', async () => {
    process.env.DATA_SOURCE_NDR = 'gateway';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ message: 'This NDR does not need a decision now.' }, { status: 409 })),
    );
    const state = await submitNdrAction({ ok: false }, form());
    expect(state).toMatchObject({ ok: false });
    vi.unstubAllGlobals();
  });
});
