import { describe, expect, it, vi } from 'vitest';
import { gatewaySubMerchantService } from './gateway';
import { subMerchantService } from './index';
import { parseSubMerchantInput } from './input';
import { createMockSubMerchantService } from './mock';
import { SUB_MERCHANT_PAGE_SIZE, type SubMerchantInput } from './types';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

const input = (over: Partial<SubMerchantInput> = {}): SubMerchantInput => ({
  name: 'Test Seller',
  email: 'test@example.com',
  gstin: null,
  bank: { holder: 'Test Seller', account: '123456789012', ifsc: 'HDFC0001234' },
  ...over,
});

describe('parseSubMerchantInput', () => {
  it('accepts a blank GSTIN as none and uppercases codes', () => {
    const parsed = parseSubMerchantInput({ ...input(), gstin: '  ', email: ' A@B.CO ', bank: { holder: 'H', account: '123456789', ifsc: 'hdfc0001234' } });
    expect(parsed).toEqual({
      ok: true,
      value: { name: 'Test Seller', email: 'a@b.co', gstin: null, bank: { holder: 'H', account: '123456789', ifsc: 'HDFC0001234' } },
    });
  });

  it('accepts a valid GSTIN and refuses a bad one', () => {
    expect(parseSubMerchantInput({ ...input(), gstin: '27aapfu0939f1zv' })).toMatchObject({
      ok: true,
      value: { gstin: '27AAPFU0939F1ZV' },
    });
    expect(parseSubMerchantInput({ ...input(), gstin: '123' })).toMatchObject({
      ok: false,
      errors: { gstin: expect.stringContaining('15-character GSTIN') },
    });
  });

  it('checks the name, email and bank details', () => {
    const parsed = parseSubMerchantInput({ name: ' ', email: 'nope', bank: { holder: '', account: '12', ifsc: 'X' } });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(Object.keys(parsed.errors).sort()).toEqual(['bank.account', 'bank.holder', 'bank.ifsc', 'email', 'name']);
    }
    expect(parseSubMerchantInput(null).ok).toBe(false);
  });
});

describe('mock sub-merchant service', () => {
  it('onboards a seller as submitted and lists it first', async () => {
    const service = createMockSubMerchantService();
    const result = await service.onboard(input());
    expect(result).toMatchObject({ ok: true, data: { name: 'Test Seller', kycStatus: 'submitted', bankLast4: '9012' } });
    const list = await service.list({ page: 1, search: '' });
    expect(list.ok && list.data.items[0]?.email).toBe('test@example.com');
  });

  it('never returns the full account number', async () => {
    const service = createMockSubMerchantService();
    await service.onboard(input());
    const list = await service.list({ page: 1, search: '' });
    expect(JSON.stringify(list)).not.toContain('123456789012');
  });

  it('rejects a duplicate email and invalid input', async () => {
    const service = createMockSubMerchantService();
    await service.onboard(input());
    expect(await service.onboard(input({ email: 'TEST@example.com' }))).toMatchObject({
      ok: false,
      error: { kind: 'conflict' },
    });
    expect(await service.onboard(input({ name: '' }))).toMatchObject({ ok: false, error: { kind: 'validation' } });
  });

  it('rejects a duplicate GSTIN but allows several sellers with none', async () => {
    const service = createMockSubMerchantService();
    await service.onboard(input({ gstin: '27AAPFU0939F1ZV' }));
    expect(await service.onboard(input({ email: 'other@example.com', gstin: '27aapfu0939f1zv' }))).toMatchObject({
      ok: false,
      error: { kind: 'conflict', message: 'A seller with this GSTIN is already onboarded.' },
    });
    expect((await service.onboard(input({ email: 'n1@example.com' }))).ok).toBe(true);
    expect((await service.onboard(input({ email: 'n2@example.com' }))).ok).toBe(true);
  });

  it('searches by name, ignoring case', async () => {
    const service = createMockSubMerchantService();
    const result = await service.list({ page: 1, search: 'KAVERI' });
    expect(result.ok && result.data.items.map((s) => s.name)).toEqual(['Kaveri Handloom']);
    const none = await service.list({ page: 1, search: 'zzzz' });
    expect(none).toMatchObject({ ok: true, data: { items: [], total: 0, pageCount: 1 } });
  });

  it('paginates and clamps a page out of range', async () => {
    const service = createMockSubMerchantService();
    const first = await service.list({ page: 1, search: '' });
    if (!first.ok) throw new Error('list failed');
    expect(first.data.items).toHaveLength(SUB_MERCHANT_PAGE_SIZE);
    expect(first.data.pageCount).toBe(2);
    const far = await service.list({ page: 99, search: '' });
    expect(far.ok && far.data.page).toBe(2);
  });
});

describe('gateway sub-merchant service', () => {
  it('lists and onboards through the settings API, never seeing the full account', async () => {
    const row = { id: 's1', name: 'Neel Crafts', email: 'neel@crafts.example', gstin: null, kyc_status: 'NOT_STARTED', bank_last4: '9012', created_at: 'x' };
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (_url, init) =>
      init?.method === 'POST' ? Response.json(row) : Response.json({ items: [row], page: 1, limit: 10, total: 11 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await gatewaySubMerchantService.list({ page: 1, search: ' neel ' })).toMatchObject({
      ok: true,
      data: { pageCount: 2, total: 11, items: [{ bankLast4: '9012', kycStatus: 'not_started' }] },
    });
    expect(new URL(fetchMock.mock.calls[0]![0]).searchParams.get('q')).toBe('neel');
    expect(await gatewaySubMerchantService.onboard(input())).toMatchObject({ ok: true, data: { id: 's1' } });
    vi.unstubAllGlobals();
  });

  it('is picked by DATA_SOURCE_SUB_MERCHANTS', () => {
    expect(subMerchantService()).not.toBe(gatewaySubMerchantService);
    process.env.DATA_SOURCE_SUB_MERCHANTS = 'gateway';
    try {
      expect(subMerchantService()).toBe(gatewaySubMerchantService);
    } finally {
      delete process.env.DATA_SOURCE_SUB_MERCHANTS;
    }
  });
});
