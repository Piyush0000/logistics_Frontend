import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signedIn = vi.hoisted(() => ({ current: true }));
const audit = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock('@/lib/admin/session', () => ({
  requireAdminSession: async () => {
    if (!signedIn.current) throw new Error('redirect:/admin/login');
    return { email: 'admin@evocships.test' };
  },
}));
vi.mock('@/lib/admin/data/system', () => ({ recordAudit: audit }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { adminMoneyService } from '@/lib/admin/data/money';
import { AMOUNT_RANGE_MESSAGE, REASON_MESSAGE } from '@/lib/admin/data/money/wallet-adjustment';
import { adjustWalletAction, type AdjustWalletState } from './actions';

const IDLE: AdjustWalletState = { status: 'idle' };

function form(values: Partial<Record<'merchantId' | 'amount' | 'direction' | 'reason' | 'step', string>> = {}) {
  const data = new FormData();
  const all = { merchantId: 'mer_002', amount: '1,200.50', direction: 'credit', reason: 'Goodwill credit for a lost parcel', ...values };
  for (const [key, value] of Object.entries(all)) data.set(key, value);
  return data;
}

async function balance(merchantId = 'mer_002') {
  const result = await adminMoneyService().getMerchantWallet(merchantId);
  if (!result.ok) throw new Error(result.error.message);
  return result.data.balancePaise;
}

beforeEach(() => {
  signedIn.current = true;
  audit.mockClear();
  // A fresh sample service for every test.
  delete (globalThis as { evocMockAdminMoney?: unknown }).evocMockAdminMoney;
});
afterEach(() => {
  delete process.env.DATA_SOURCE_ADMIN_MONEY;
});

describe('adjustWalletAction', () => {
  it('refuses a signed-out caller before reading anything', async () => {
    signedIn.current = false;
    await expect(adjustWalletAction(IDLE, form({ step: 'confirm' }))).rejects.toThrow('redirect:/admin/login');
    expect(await balance()).toBe(1_180_000);
  });

  it('reviews without saving, showing the new balance', async () => {
    const state = await adjustWalletAction(IDLE, form());
    expect(state).toEqual({
      status: 'review',
      amountPaise: 120_050,
      direction: 'credit',
      reason: 'Goodwill credit for a lost parcel',
      currentPaise: 1_180_000,
      newPaise: 1_300_050,
    });
    expect(await balance()).toBe(1_180_000);
    expect(audit).not.toHaveBeenCalled();
  });

  it('saves on confirm and records it in the audit log', async () => {
    const state = await adjustWalletAction(IDLE, form({ step: 'confirm', direction: 'debit', amount: '350' }));
    expect(state).toMatchObject({ status: 'saved', balancePaise: 1_145_000 });
    expect(await balance()).toBe(1_145_000);
    expect(audit).toHaveBeenCalledWith({
      action: 'Wallet debit',
      target: 'mer_002 · Neelgiri Teas',
      detail: '₹350.00. Goodwill credit for a lost parcel',
    });
  });

  it.each(['0', '-50', '500000.01', '1.234'])('rejects an amount of %s on the server', async (amount) => {
    const state = await adjustWalletAction(IDLE, form({ step: 'confirm', amount }));
    expect(state).toEqual({ status: 'invalid', errors: { amount: AMOUNT_RANGE_MESSAGE }, message: null });
    expect(await balance()).toBe(1_180_000);
    expect(audit).not.toHaveBeenCalled();
  });

  it('rejects a short reason', async () => {
    const state = await adjustWalletAction(IDLE, form({ step: 'confirm', reason: 'oops' }));
    expect(state).toEqual({ status: 'invalid', errors: { reason: REASON_MESSAGE }, message: null });
  });

  it('rejects an unknown merchant, even one sent straight to confirm', async () => {
    for (const step of ['review', 'confirm']) {
      expect(await adjustWalletAction(IDLE, form({ step, merchantId: 'mer_999' }))).toEqual({
        status: 'invalid',
        errors: {},
        message: 'That merchant does not exist.',
      });
    }
    expect(audit).not.toHaveBeenCalled();
  });

  it('saves through the gateway in gateway mode and records it in the audit log', async () => {
    process.env.DATA_SOURCE_ADMIN_MONEY = 'gateway';
    const wallet = (available: number) => ({
      merchant_id: 'mer_002',
      merchant_name: 'Acme',
      available,
      reserved: 0,
      pending_cod: 0,
    });
    const fetchMock = vi.fn(async (url: string) =>
      Response.json(url.endsWith('/adjust') ? wallet(12_345) : { items: [wallet(100)] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const state = await adjustWalletAction(IDLE, form({ step: 'confirm' }));
    expect(state).toMatchObject({ status: 'saved', balancePaise: 12_345 });
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/api/v1/admin/wallets/mer_002/adjust'))).toBe(true);
    expect(audit).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
