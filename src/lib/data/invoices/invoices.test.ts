import { describe, expect, it, vi } from 'vitest';
import { invoiceService } from '.';
import { gatewayInvoiceService } from './gateway';
import { gstOf, INVOICE_YEARS } from './gst';
import { mockInvoiceService, SAMPLE_INVOICES } from './mock';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

const list = async (query: { page: number; year?: number }) => {
  const result = await mockInvoiceService.listInvoices(query);
  if (!result.ok) throw new Error('The sample invoices should not fail');
  return result.data;
};

describe('gstOf', () => {
  it('calculates 18% GST', () => {
    expect(gstOf(100000)).toBe(18000);
  });

  it('rounds to the nearest paise', () => {
    expect(gstOf(1)).toBe(0); // 0.18
    expect(gstOf(3)).toBe(1); // 0.54
    expect(gstOf(25)).toBe(5); // 4.5 rounds up
    expect(gstOf(1234567)).toBe(222222); // 222222.06
    expect(gstOf(0)).toBe(0);
  });
});

describe('sample invoices', () => {
  it('totals match taxable plus GST for every sample invoice', () => {
    for (const invoice of SAMPLE_INVOICES) {
      expect(invoice.taxablePaise).toBe(invoice.freightPaise + invoice.codFeesPaise);
      expect(invoice.gstPaise).toBe(gstOf(invoice.taxablePaise));
      expect(invoice.totalPaise).toBe(invoice.taxablePaise + invoice.gstPaise);
      for (const paise of [invoice.freightPaise, invoice.codFeesPaise, invoice.totalPaise]) {
        expect(Number.isInteger(paise)).toBe(true);
      }
    }
  });

  it('are newest first, with unique ids and numbers', () => {
    const starts = SAMPLE_INVOICES.map(({ periodStart }) => periodStart);
    expect(starts).toEqual([...starts].sort().reverse());
    expect(new Set(SAMPLE_INVOICES.map(({ id }) => id)).size).toBe(SAMPLE_INVOICES.length);
    expect(new Set(SAMPLE_INVOICES.map(({ number }) => number)).size).toBe(SAMPLE_INVOICES.length);
  });

  it('include a long number and a total of at least one crore rupees', () => {
    expect(SAMPLE_INVOICES.some(({ number }) => number.length >= 24)).toBe(true);
    expect(SAMPLE_INVOICES.some(({ totalPaise }) => totalPaise >= 1_00_00_000_00)).toBe(true);
  });

  it('only cover the years the filter offers or an empty one', () => {
    expect(INVOICE_YEARS).toContain(2024);
    expect(SAMPLE_INVOICES.some(({ periodStart }) => periodStart.startsWith('2024'))).toBe(false);
  });
});

describe('mock listInvoices', () => {
  it('pages the sample, labelled as sample', async () => {
    const result = await mockInvoiceService.listInvoices({ page: 1 });
    expect(result.source).toBe('mock');
    const first = await list({ page: 1 });
    const last = await list({ page: first.pageCount });

    expect(first.items).toHaveLength(10);
    expect(first.pageCount).toBe(Math.ceil(SAMPLE_INVOICES.length / 10));
    expect(last.items.length).toBeGreaterThan(0);
  });

  it('filters by year', async () => {
    const data = await list({ page: 1, year: 2025 });

    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items.every(({ periodStart }) => periodStart.startsWith('2025'))).toBe(true);
  });

  it('returns no rows for a year with no invoices', async () => {
    expect(await list({ page: 1, year: 2024 })).toEqual({ items: [], page: 1, pageCount: 1 });
  });

  it('keeps a page past the end inside the range', async () => {
    const data = await list({ page: 99 });
    expect(data.page).toBe(data.pageCount);
  });
});

describe('mock getInvoice', () => {
  it('finds an invoice by id', async () => {
    const result = await mockInvoiceService.getInvoice(SAMPLE_INVOICES[0]!.id);
    expect(result).toMatchObject({ ok: true, source: 'mock', data: { id: SAMPLE_INVOICES[0]!.id } });
  });

  it('says not found for an unknown id', async () => {
    const result = await mockInvoiceService.getInvoice('nope');
    expect(result).toMatchObject({ ok: false, error: { kind: 'not_found', status: 404 } });
  });
});

describe('gateway invoices', () => {
  it('reads monthly statements and pages them', async () => {
    const statement = (month: string) => ({
      id: month,
      number: `EVS/2026-27/ABC123/${month.replace('-', '')}`,
      period_start: `${month}-01`,
      period_end: `${month}-30`,
      shipments: 3,
      freight_paise: 16_520,
      cod_fees_paise: 0,
      taxable_paise: 14_000,
      gst_paise: 2_520,
      total_paise: 16_520,
      status: 'paid',
      issued_at: '2026-11-01T00:00:00.000Z',
    });
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) =>
      url.endsWith('/2026-10')
        ? Response.json(statement('2026-10'))
        : Response.json({ items: Array.from({ length: 12 }, (_, i) => statement(`2025-${String(12 - i).padStart(2, '0')}`)) }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const page2 = await gatewayInvoiceService.listInvoices({ page: 2, year: 2025 });
    expect(page2).toMatchObject({ ok: true, data: { page: 2, pageCount: 2 } });
    if (page2.ok) expect(page2.data.items).toHaveLength(2);
    expect(new URL(fetchMock.mock.calls[0]![0]).searchParams.get('year')).toBe('2025');
    expect(await gatewayInvoiceService.getInvoice('2026-10')).toMatchObject({
      ok: true,
      data: { taxablePaise: 14_000, gstPaise: 2_520, totalPaise: 16_520, status: 'paid' },
    });
    vi.unstubAllGlobals();
  });
});

describe('invoiceService', () => {
  it('uses the sample until DATA_SOURCE_INVOICES says gateway', () => {
    const before = process.env.DATA_SOURCE_INVOICES;
    try {
      delete process.env.DATA_SOURCE_INVOICES;
      expect(invoiceService()).toBe(mockInvoiceService);
      process.env.DATA_SOURCE_INVOICES = 'gateway';
      expect(invoiceService()).toBe(gatewayInvoiceService);
    } finally {
      if (before === undefined) delete process.env.DATA_SOURCE_INVOICES;
      else process.env.DATA_SOURCE_INVOICES = before;
    }
  });
});
