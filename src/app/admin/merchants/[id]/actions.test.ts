import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionMock = vi.hoisted(() => ({ hasSession: true }));

vi.mock('@/lib/admin/session', () => ({
  requireAdminSession: async () => {
    if (!sessionMock.hasSession) {
      throw new Error('REDIRECT_TO_LOGIN');
    }
    return { email: 'admin@evocships.test' };
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { resetMockMerchants } from '@/lib/admin/data/merchants';
import { updateMerchantStatusAction } from './actions';

describe('updateMerchantStatusAction', () => {
  beforeEach(() => {
    sessionMock.hasSession = true;
    resetMockMerchants();
  });

  it('rejects unauthenticated requests by redirecting/failing session check', async () => {
    sessionMock.hasSession = false;
    await expect(
      updateMerchantStatusAction('mer_001', 'suspended', 'Valid reason here'),
    ).rejects.toThrow('REDIRECT_TO_LOGIN');
  });

  it('validates merchant id', async () => {
    const res = await updateMerchantStatusAction('', 'suspended', 'Valid reason here');
    expect(res).toEqual({ ok: false, message: 'Invalid merchant identifier.' });
  });

  it('validates status', async () => {
    const res = await updateMerchantStatusAction('mer_001', 'invalid_status', 'Valid reason here');
    expect(res).toEqual({ ok: false, message: 'Invalid merchant status.' });
  });

  it('validates reason length', async () => {
    const short = await updateMerchantStatusAction('mer_001', 'suspended', 'bad');
    expect(short).toEqual({ ok: false, message: 'Reason must be between 5 and 300 characters.' });

    const long = await updateMerchantStatusAction('mer_001', 'suspended', 'a'.repeat(301));
    expect(long).toEqual({ ok: false, message: 'Reason must be between 5 and 300 characters.' });
  });

  it('successfully updates status and returns ok message', async () => {
    const res = await updateMerchantStatusAction('mer_001', 'suspended', 'Violating policy terms');
    expect(res).toEqual({ ok: true, message: 'Merchant suspended.' });

    const reactivateRes = await updateMerchantStatusAction('mer_001', 'active', 'Resolved compliance issue');
    expect(reactivateRes).toEqual({ ok: true, message: 'Merchant status updated.' });
  });
});

