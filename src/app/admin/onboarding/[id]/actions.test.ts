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

import { resetMockApplications } from '@/lib/admin/data/onboarding';
import { decideApplicationAction } from './actions';

describe('decideApplicationAction', () => {
  beforeEach(() => {
    sessionMock.hasSession = true;
    resetMockApplications();
  });

  it('rejects unauthenticated requests', async () => {
    sessionMock.hasSession = false;
    await expect(decideApplicationAction('app_mer_006', 'approved')).rejects.toThrow('REDIRECT_TO_LOGIN');
  });

  it('validates application id', async () => {
    const res = await decideApplicationAction('', 'approved');
    expect(res).toEqual({ ok: false, message: 'Invalid application identifier.' });
  });

  it('validates decision enum', async () => {
    const res = await decideApplicationAction('app_mer_006', 'maybe');
    expect(res).toEqual({ ok: false, message: 'Invalid decision: must be approved or rejected.' });
  });

  it('validates rejection reason presence and length', async () => {
    const missing = await decideApplicationAction('app_mer_006', 'rejected');
    expect(missing).toEqual({ ok: false, message: 'Rejection reason is required.' });

    const short = await decideApplicationAction('app_mer_006', 'rejected', 'Too short');
    expect(short).toEqual({ ok: false, message: 'Rejection reason must be between 10 and 500 characters.' });

    const long = await decideApplicationAction('app_mer_006', 'rejected', 'A'.repeat(501));
    expect(long).toEqual({ ok: false, message: 'Rejection reason must be between 10 and 500 characters.' });
  });

  it('approves application and returns success message', async () => {
    const res = await decideApplicationAction('app_mer_006', 'approved');
    expect(res).toEqual({
      ok: true,
      message: 'Application approved successfully. Merchant account is now active.',
      targetStatus: 'approved',
    });
  });

  it('rejects application with valid reason', async () => {
    const res = await decideApplicationAction('app_mer_006', 'rejected', 'Documents are illegible and missing GSTIN certificate.');
    expect(res).toEqual({
      ok: true,
      message: 'Application rejected.',
      targetStatus: 'rejected',
    });
  });

  it('prevents double decision', async () => {
    await decideApplicationAction('app_mer_006', 'approved');
    const second = await decideApplicationAction('app_mer_006', 'approved');
    expect(second).toEqual({
      ok: false,
      message: 'This application has already been decided.',
    });
  });
});

