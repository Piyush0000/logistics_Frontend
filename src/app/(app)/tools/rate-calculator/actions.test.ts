import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({ getRateCard: vi.fn(), quote: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/rates', async (original) => ({
  ...(await original<typeof import('@/lib/data/rates')>()),
  ratesService: () => service,
}));

import { quoteAction } from './actions';

const valid = {
  originPincode: '110001',
  destinationPincode: '400001',
  weightKg: 1.5,
  lengthCm: 20,
  widthCm: 15,
  heightCm: 10,
  paymentType: 'PREPAID',
};

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.quote.mockReset();
});

describe('quoteAction', () => {
  it('refuses a signed-out quote before touching the service', async () => {
    session.current = null;
    expect(await quoteAction(valid)).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.quote).not.toHaveBeenCalled();
  });

  it('rejects pincode 012345 on the server', async () => {
    const result = await quoteAction({ ...valid, originPincode: '012345' });
    expect(result).toMatchObject({ ok: false, errors: { originPincode: expect.any(String) } });
    expect(service.quote).not.toHaveBeenCalled();
  });

  it('rejects bad pincodes, weights and sizes without calling the service', async () => {
    for (const bad of [
      { ...valid, destinationPincode: '40000' },
      { ...valid, destinationPincode: 'abcdef' },
      { ...valid, weightKg: 0 },
      { ...valid, weightKg: 1001 },
      { ...valid, weightKg: '1' },
      { ...valid, lengthCm: 501 },
      { ...valid, heightCm: -1 },
      { ...valid, paymentType: 'CHEQUE' },
      null,
      'x',
      [],
    ]) {
      expect(await quoteAction(bad)).toMatchObject({ ok: false });
    }
    expect(service.quote).not.toHaveBeenCalled();
  });

  it('requires a COD amount for COD', async () => {
    for (const codAmount of [undefined, 0, -5, 10_000_001]) {
      expect(await quoteAction({ ...valid, paymentType: 'COD', codAmount })).toMatchObject({
        ok: false,
        errors: { codAmount: expect.any(String) },
      });
    }
    expect(service.quote).not.toHaveBeenCalled();
  });

  it('sends camelCase input with the COD amount in paise, and no merchant_id', async () => {
    service.quote.mockResolvedValue({ ok: true, source: 'mock', data: [] });
    await quoteAction({ ...valid, paymentType: 'COD', codAmount: 499.5, merchant_id: 'm1' });
    expect(service.quote).toHaveBeenCalledWith({
      originPincode: '110001',
      destinationPincode: '400001',
      weightKg: 1.5,
      dimensions: { lengthCm: 20, widthCm: 15, heightCm: 10 },
      paymentType: 'COD',
      codAmountPaise: 49950,
    });
  });

  it('ignores a COD amount for prepaid', async () => {
    service.quote.mockResolvedValue({ ok: true, source: 'mock', data: [] });
    await quoteAction({ ...valid, codAmount: 500 });
    expect(service.quote.mock.calls[0]![0]).not.toHaveProperty('codAmountPaise');
  });

  it('sorts the quotes cheapest first, with not serviceable last', async () => {
    const q = (carrier: string, serviceable: boolean, chargePaise: number | null) => ({
      carrier,
      serviceable,
      codAvailable: true,
      estimatedDays: 2,
      chargePaise,
      chargeableWeightKg: 1.5,
    });
    service.quote.mockResolvedValue({
      ok: true,
      source: 'mock',
      data: [q('dhl', false, null), q('bluedart', true, 9000), q('ekart', true, 5000)],
    });
    const result = await quoteAction(valid);
    expect(result).toMatchObject({ ok: true, source: 'mock' });
    if (result.ok) expect(result.quotes.map((x) => x.carrier)).toEqual(['ekart', 'bluedart', 'dhl']);
  });

  it('returns the service message when quotes are unavailable', async () => {
    service.quote.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    });
    expect(await quoteAction(valid)).toEqual({ ok: false, message: 'This data is not available yet.' });
  });
});
