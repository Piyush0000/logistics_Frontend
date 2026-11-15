import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ getDemoSession: vi.fn() }));
vi.mock('@/lib/auth/session', () => session);
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { onboardSubMerchantAction } from './actions';

const valid = {
  name: 'Action Seller',
  email: 'action-seller@example.com',
  gstin: '',
  bank: { holder: 'Action Seller', account: '123456789012', ifsc: 'HDFC0001234' },
};

describe('sub-merchant actions', () => {
  beforeEach(() => session.getDemoSession.mockReset());

  it('refuses a signed-out onboard', async () => {
    session.getDemoSession.mockResolvedValue(null);
    expect(await onboardSubMerchantAction(valid)).toEqual({ ok: false, message: 'Sign in again.' });
  });

  it('checks the input again on the server', async () => {
    session.getDemoSession.mockResolvedValue({ email: 'ops@example.com' });
    const result = await onboardSubMerchantAction({ ...valid, bank: { ...valid.bank, ifsc: 'bad' } });
    expect(result).toMatchObject({ ok: false, errors: { 'bank.ifsc': expect.any(String) } });
    expect(await onboardSubMerchantAction('nope')).toMatchObject({ ok: false });
  });

  it('onboards a signed-in merchant', async () => {
    session.getDemoSession.mockResolvedValue({ email: 'ops@example.com' });
    expect(await onboardSubMerchantAction(valid)).toEqual({
      ok: true,
      message: 'Action Seller was onboarded.',
    });
  });
});
