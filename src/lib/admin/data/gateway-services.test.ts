import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gatewayAdminMerchantsService, merchantStatus } from './merchants/gateway';
import { gatewayAdminMoneyService } from './money/gateway';
import { gatewayAdminOnboardingService } from './onboarding/gateway';
import { attentionFor } from './overview/gateway';
import { gatewayAdminShipmentsService } from './shipments/gateway';

const ADMIN_KEY = 'k'.repeat(64);
const M1 = '0f8fad5b-d9cb-469f-a165-70867728950e';

const merchant = {
  id: M1,
  name: 'Evoc Labs',
  phone: '9876543210',
  status: 'ACTIVE',
  kyc_status: 'PENDING',
  kyc_note: null,
  kyc_reviewed_at: null,
  owner_email: 'owner@evoc.test',
  owner_name: 'Owner',
  created_at: '2026-11-19T17:09:26.000Z',
};

let fetchMock: ReturnType<typeof vi.fn>;
function answer(body: unknown, status = 200) {
  fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json(body, { status }));
  vi.stubGlobal('fetch', fetchMock);
}
const call = (n = 0) => {
  const [url, init] = fetchMock.mock.calls[n] as [string, RequestInit];
  return { url: new URL(url), init, headers: init.headers as Record<string, string> };
};

beforeEach(() => {
  process.env.ADMIN_API_KEY = ADMIN_KEY;
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ADMIN_API_KEY;
});

describe('merchant status', () => {
  it('is suspended first, then active only once KYC is approved', () => {
    expect(merchantStatus({ status: 'SUSPENDED', kyc_status: 'VERIFIED' })).toBe('suspended');
    expect(merchantStatus({ status: 'ACTIVE', kyc_status: 'VERIFIED' })).toBe('active');
    expect(merchantStatus({ status: 'ACTIVE', kyc_status: 'NOT_STARTED' })).toBe('pending');
  });
});

describe('admin merchants (gateway)', () => {
  it('sends the admin key and translates the "pending" filter for identity', async () => {
    answer({ items: [{ ...merchant, wallet_available_paise: 500, shipments_30d: 3 }], page: 1, limit: 10, total: 1 });
    const result = await gatewayAdminMerchantsService.listMerchants({ status: 'pending', q: ' evoc ' });
    const { url, headers } = call();
    expect(url.pathname).toBe('/api/v1/admin/merchants');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      q: 'evoc',
      status: 'ACTIVE',
      kyc: 'NOT_STARTED,PENDING,REJECTED',
    });
    expect(headers.authorization).toBe(`Bearer ${ADMIN_KEY}`);
    expect(result).toMatchObject({
      ok: true,
      source: 'gateway',
      data: { total: 1, items: [{ id: M1, status: 'pending', kyc: 'submitted', walletPaise: 500, shipments30d: 3 }] },
    });
  });

  it('refuses to set "pending" by hand: it follows from KYC', async () => {
    answer({});
    const result = await gatewayAdminMerchantsService.setMerchantStatus(M1, 'pending', 'because');
    expect(result).toMatchObject({ ok: false, error: { kind: 'validation' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('admin KYC (gateway)', () => {
  it('approves as VERIFIED and rejects with the reason as the note', async () => {
    answer({ ...merchant, kyc_status: 'REJECTED', kyc_note: 'GSTIN does not match' });
    const result = await gatewayAdminOnboardingService.decide(M1, 'rejected', 'GSTIN does not match');
    const { url, init } = call();
    expect(url.pathname).toBe(`/api/v1/admin/merchants/${M1}/kyc`);
    expect(JSON.parse(String(init.body))).toEqual({ status: 'REJECTED', note: 'GSTIN does not match' });
    expect(result).toMatchObject({
      ok: true,
      data: { id: M1, status: 'rejected', rejectionReason: 'GSTIN does not match', documents: [] },
    });
  });
});

describe('admin shipments (gateway)', () => {
  const row = {
    id: 's1',
    awb: 'EVS0000000018',
    carrier_awb: '71705910000055',
    merchant_id: M1,
    merchant_name: 'Evoc Labs',
    carrier: 'delhivery',
    status: 'IN_TRANSIT',
    reference_id: null,
    failure_reason: null,
    created_at: '2026-11-20T10:00:00.000Z',
    last_event_at: '2026-11-21T10:00:00.000Z',
    stuck: true,
  };

  it('lists every merchant’s shipments with the stuck flag', async () => {
    answer({ items: [row], pagination: { page: 1, limit: 100, total: 1, total_pages: 1 } });
    const result = await gatewayAdminShipmentsService.listShipments({ pageSize: 100, stuck: true });
    expect(Object.fromEntries(call().url.searchParams)).toMatchObject({ limit: '100', stuck: 'true' });
    expect(result).toMatchObject({
      ok: true,
      data: { items: [{ awb: 'EVS0000000018', merchantName: 'Evoc Labs', stuck: true }], total: 1 },
    });
  });

  it('shows a shipment with places, recipient and timeline', async () => {
    answer({
      ...row,
      origin_pin: '122001',
      dest_pin: '560001',
      weight_grams: 1200,
      payment_type: 'COD',
      cod_amount_paise: 99_800,
      origin: { name: 'Store', phone: '9000000000', city: 'Gurugram', state: 'HR', pincode: '122001' },
      destination: { name: 'Asha', phone: '9876543210', city: 'Bengaluru', state: 'KA', pincode: '560001' },
      timeline: [{ status: 'IN_TRANSIT', raw_status: 'In Transit', location: 'Delhi Hub', occurred_at: 'x' }],
    });
    const result = await gatewayAdminShipmentsService.getShipment('EVS0000000018');
    expect(result).toMatchObject({
      ok: true,
      data: {
        origin: 'Gurugram, HR, 122001',
        destination: 'Bengaluru, KA, 560001',
        recipientName: 'Asha',
        codAmountPaise: 99_800,
        timeline: [{ status: 'IN_TRANSIT', rawStatus: 'In Transit', location: 'Delhi Hub' }],
      },
    });
  });

  it('says NDR is not available yet instead of showing sample rows', async () => {
    expect(await gatewayAdminShipmentsService.listNdrShipments()).toMatchObject({
      ok: false,
      error: { kind: 'unavailable' },
    });
  });
});

describe('overview attention items', () => {
  it('lists only what needs the admin, from the live figures', () => {
    const items = attentionFor({
      merchants: { total: 3, active: 1, pending_kyc: 2, suspended: 0 },
      shipments: { today: 0, in_transit: 0, delivered_30d: 0, rto_30d: 0, stuck: 0, failed: 1 },
      money: { wallet_float_paise: 0, negative_wallets: 0, cod_outstanding_paise: 0, charged_30d_paise: 0 },
      shipments_by_day: [],
      pipeline: { to_process: 0, in_transit: 0, out_for_delivery: 0, returning: 0 },
    });
    expect(items.map((i) => i.id)).toEqual(['kyc', 'failed']);
    expect(items[0]?.title).toBe('2 merchants waiting for KYC');
  });
});

describe('admin wallet adjustment (gateway)', () => {
  it('posts the adjustment with a fresh idempotency key and returns the new wallet', async () => {
    answer({ merchant_id: M1, merchant_name: 'Evoc Labs', available: 50_000, reserved: 0, pending_cod: 0 });
    const adjustment = { merchantId: M1, amountPaise: 50_000, direction: 'credit' as const, reason: 'Opening balance' };
    const result = await gatewayAdminMoneyService.adjustWallet(adjustment);
    const { url, init } = call();
    expect(url.pathname).toBe(`/api/v1/admin/wallets/${M1}/adjust`);
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ direction: 'credit', amount_paise: 50_000, reason: 'Opening balance' });
    expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(result).toMatchObject({ ok: true, data: { merchantId: M1, merchantName: 'Evoc Labs', balancePaise: 50_000 } });

    await gatewayAdminMoneyService.adjustWallet(adjustment);
    expect(JSON.parse(String(call(1).init.body)).idempotency_key).not.toBe(body.idempotency_key);
  });
});

describe('admin COD (gateway)', () => {
  const batch = {
    id: 'COD-DEL-20261122',
    carrier: 'delhivery',
    period_end: '2026-11-22',
    due_date: '2026-11-29',
    expected_paise: 149_800,
    received_paise: 144_800,
    status: 'short',
    utr: 'UTIB0011020045',
    line_count: 2,
    reconciled_at: '2026-11-30T10:00:00.000Z',
    bank_verification: null,
  };

  it('maps batches, and owes only what is not reconciled', async () => {
    answer({ items: [batch, { ...batch, id: 'COD-DEL-20261129', status: 'expected', received_paise: 0, reconciled_at: null }] });
    const list = await gatewayAdminMoneyService.listRemittances();
    expect(list).toMatchObject({ ok: true, data: [{ id: 'COD-DEL-20261122', status: 'short', periodEnd: '2026-11-22' }, {}] });
  });

  it('records a courier payment with a fresh key', async () => {
    answer({ paid_lines: 2, unknown: 1, duplicates: 0, batches: ['COD-DEL-20261122'] });
    const result = await gatewayAdminMoneyService.recordCodPayment({
      carrier: 'delhivery',
      utr: null,
      lines: [{ awb: '71705910000055', amountPaise: 99_800 }],
    });
    const { url, init } = call();
    expect(url.pathname).toBe('/api/v1/admin/cod/payments');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ carrier: 'delhivery', lines: [{ awb: '71705910000055', amount_paise: 99_800 }] });
    expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/);
    expect(result).toMatchObject({ ok: true, data: { paidLines: 2, unknown: 1, batches: ['COD-DEL-20261122'] } });
  });

  it('reconciles a batch', async () => {
    answer({ batch, matched: 1, mismatched: 1 });
    const result = await gatewayAdminMoneyService.reconcileRemittance('COD-DEL-20261122');
    expect(call().url.pathname).toBe('/api/v1/admin/cod/batches/COD-DEL-20261122/reconcile');
    expect(result).toMatchObject({ ok: true, data: { matched: 1, mismatched: 1, remittance: { status: 'short' } } });
  });
});
