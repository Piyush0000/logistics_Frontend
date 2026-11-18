import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { adminPricingService } from '@/lib/admin/data/pricing';
import { PRICE_MESSAGE } from '@/lib/admin/data/pricing/pricing-rules';
import {
  addOverrideAction,
  removeOverrideAction,
  setCourierAction,
  updateRateAction,
  type PricingActionState,
} from './actions';

const IDLE: PricingActionState = { status: 'idle' };
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const rate = { carrier: 'ekart', zone: 'C', base: '45', extra: '25.80', codPercent: '2', codMinimum: '35' };

async function row(carrier: string, zone: string) {
  const result = await adminPricingService().listRateCard();
  if (!result.ok) throw new Error(result.error.message);
  return result.data.find((entry) => entry.carrier === carrier && entry.zone === zone)!;
}

beforeEach(() => {
  signedIn.current = true;
  audit.mockClear();
  delete (globalThis as { evocMockAdminPricing?: unknown }).evocMockAdminPricing;
});

describe('setCourierAction', () => {
  it('refuses a signed-out caller', async () => {
    signedIn.current = false;
    await expect(setCourierAction(IDLE, form({ carrier: 'ekart', enabled: 'false' }))).rejects.toThrow('redirect:/admin/login');
  });

  it('turns a courier off and audits it', async () => {
    expect(await setCourierAction(IDLE, form({ carrier: 'ekart', enabled: 'false' }))).toEqual({ status: 'saved', message: 'Ekart is off.' });
    expect(audit).toHaveBeenCalledWith({ action: 'Courier disabled', target: 'ekart', detail: 'Ekart turned off for new bookings.' });
  });

  it('refuses the last courier on the server, with a clear message, and audits nothing', async () => {
    for (const carrier of ['delhivery', 'ekart', 'bluedart']) await setCourierAction(IDLE, form({ carrier, enabled: 'false' }));
    audit.mockClear();
    const state = await setCourierAction(IDLE, form({ carrier: 'shadowfax', enabled: 'false' }));
    expect(state).toMatchObject({ status: 'invalid', message: expect.stringContaining('At least one courier must stay on') });
    expect(audit).not.toHaveBeenCalled();
  });
});

describe('updateRateAction', () => {
  it('reviews without saving, then saves on confirm and audits only what changed', async () => {
    const review = await updateRateAction(IDLE, form(rate));
    expect(review).toMatchObject({ status: 'review', before: { basePaise: 4_300 }, after: { basePaise: 4_500, codPercent: 2 } });
    expect((await row('ekart', 'C')).basePaise).toBe(4_300);

    expect(await updateRateAction(IDLE, form({ ...rate, step: 'confirm' }))).toMatchObject({ status: 'saved' });
    expect((await row('ekart', 'C')).basePaise).toBe(4_500);
    expect(audit).toHaveBeenCalledWith({
      action: 'Rate card updated',
      target: 'ekart · zone C',
      detail: 'Base ₹43.00 → ₹45.00; COD 1.75% → 2%.',
    });
  });

  it.each(['0', '10000.01', '1.234', 'free'])('rejects a base price of %s on the server', async (base) => {
    expect(await updateRateAction(IDLE, form({ ...rate, base, step: 'confirm' }))).toEqual({
      status: 'invalid',
      errors: { base: PRICE_MESSAGE },
      message: null,
    });
    expect((await row('ekart', 'C')).basePaise).toBe(4_300);
    expect(audit).not.toHaveBeenCalled();
  });

  it('rejects a row that does not exist', async () => {
    expect(await updateRateAction(IDLE, form({ ...rate, zone: 'Z', step: 'confirm' }))).toMatchObject({
      message: 'That rate card row does not exist.',
    });
  });
});

describe('override actions', () => {
  it('adds and removes an override, auditing both', async () => {
    const added = await addOverrideAction(IDLE, form({ merchantId: 'mer_002', carrier: 'all', discount: '6', reason: 'Big account' }));
    expect(added).toEqual({ status: 'saved', message: 'Neelgiri Teas now gets 6% off.' });
    expect(audit).toHaveBeenLastCalledWith({
      action: 'Price override added',
      target: 'mer_002 · Neelgiri Teas',
      detail: '6% off all couriers. Big account',
    });
    expect(await removeOverrideAction(IDLE, form({ id: 'ovr_003' }))).toMatchObject({ status: 'saved' });
    expect(audit).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'Price override removed' }));
  });

  it('rejects a duplicate and an unknown merchant', async () => {
    expect(await addOverrideAction(IDLE, form({ merchantId: 'mer_003', carrier: 'all', discount: '6', reason: 'Big account' }))).toMatchObject({
      message: expect.stringContaining('already has a custom price'),
    });
    expect(await addOverrideAction(IDLE, form({ merchantId: 'mer_999', carrier: 'all', discount: '6', reason: 'Big account' }))).toMatchObject({
      message: 'Merchant not found.',
    });
  });
});
