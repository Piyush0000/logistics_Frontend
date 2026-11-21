import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({ getCompany: vi.fn(), saveCompany: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/company', async (original) => ({
  ...(await original<typeof import('@/lib/data/company')>()),
  companyService: () => service,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { saveCompanyAction } from './actions';

const details = {
  legalName: 'Asha Traders',
  brandName: 'Asha Mart',
  gstin: '27aapfu0939f1zv',
  pan: 'AAPFU0939F',
  address: { name: 'Asha', phone: '9811111111', line1: '12 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
  bank: { holder: 'Asha', account: '123456789012', ifsc: 'HDFC0001234' },
};
const docs = (['gst', 'pan', 'cheque'] as const).map((kind) => ({ kind, name: `${kind}.pdf`, type: 'application/pdf', size: 10 }));

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.getCompany
    .mockReset()
    .mockResolvedValue({ ok: true, source: 'mock', data: { details: null, kycStatus: 'not_started', documents: [] } });
  service.saveCompany.mockReset();
});

describe('saveCompanyAction', () => {
  it('refuses a signed-out caller before touching the service', async () => {
    session.current = null;
    expect(await saveCompanyAction({ details, documents: docs })).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.getCompany).not.toHaveBeenCalled();
    expect(service.saveCompany).not.toHaveBeenCalled();
  });

  it('returns field errors for bad details', async () => {
    const result = await saveCompanyAction({ details: { ...details, gstin: 'bad' }, documents: docs });
    expect(result).toMatchObject({ ok: false, errors: { gstin: expect.any(String) } });
    expect(service.saveCompany).not.toHaveBeenCalled();
  });

  it('requires all three documents', async () => {
    const result = await saveCompanyAction({ details, documents: docs.slice(0, 1) });
    expect(result).toEqual({ ok: false, message: 'Add the PAN card.' });
    expect(service.saveCompany).not.toHaveBeenCalled();
  });

  it('refuses malformed input', async () => {
    expect((await saveCompanyAction(null)).ok).toBe(false);
    expect((await saveCompanyAction({ details, documents: 'x' })).ok).toBe(false);
    expect(service.saveCompany).not.toHaveBeenCalled();
  });

  it('saves the cleaned details', async () => {
    service.saveCompany.mockResolvedValue({ ok: true, source: 'mock', data: { kycStatus: 'submitted' } });
    const result = await saveCompanyAction({ details, documents: docs });
    expect(result).toEqual({ ok: true, message: 'Your details were sent for review.' });
    expect(service.saveCompany.mock.calls[0]![0].gstin).toBe('27AAPFU0939F1ZV');
  });

  it('shows the service error', async () => {
    service.saveCompany.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'Coming soon: this is not connected to live data yet.' },
    });
    expect(await saveCompanyAction({ details, documents: docs })).toEqual({
      ok: false,
      message: 'Coming soon: this is not connected to live data yet.',
    });
  });
});
