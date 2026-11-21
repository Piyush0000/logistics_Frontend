import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({ startRecharge: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/wallet', () => ({ walletService: () => service }));

import { startRechargeAction } from './actions';

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.startRecharge.mockReset();
  service.startRecharge.mockResolvedValue({ ok: true, source: 'mock', data: { paymentUrl: null } });
});

describe('startRechargeAction', () => {
  it('refuses a signed-out recharge before touching the service', async () => {
    session.current = null;

    expect(await startRechargeAction(50000)).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.startRecharge).not.toHaveBeenCalled();
  });

  it.each([9900, 50000001, 10050, 0, -10000, 12.5, NaN, '50000', null, undefined])(
    'rejects %j on the server',
    async (bad) => {
      const result = await startRechargeAction(bad);

      expect(result.ok).toBe(false);
      expect(service.startRecharge).not.toHaveBeenCalled();
    },
  );

  it.each([10000, 50000, 50000000])('passes %d paise to the service', async (paise) => {
    expect(await startRechargeAction(paise)).toEqual({ ok: true, paymentUrl: null });
    expect(service.startRecharge).toHaveBeenCalledWith(paise);
  });

  it('passes a secure payment link back for the browser to open', async () => {
    service.startRecharge.mockResolvedValue({
      ok: true,
      source: 'gateway',
      data: { paymentUrl: 'https://pay.example.com/session/1' },
    });

    expect(await startRechargeAction(50000)).toEqual({
      ok: true,
      paymentUrl: 'https://pay.example.com/session/1',
    });
  });

  it('never passes on a link that is not https', async () => {
    service.startRecharge.mockResolvedValue({
      ok: true,
      source: 'gateway',
      data: { paymentUrl: 'javascript:alert(1)' },
    });

    expect((await startRechargeAction(50000)).ok).toBe(false);
  });

  it('returns the service error message', async () => {
    service.startRecharge.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'Coming soon: this is not connected to live data yet.' },
    });

    expect(await startRechargeAction(50000)).toEqual({
      ok: false,
      message: 'Coming soon: this is not connected to live data yet.',
    });
  });
});
