import { fromMock } from '../source';
import { gstOf, INVOICES_PAGE_SIZE } from './gst';
import type { Invoice, InvoiceService } from './types';

const pad = (value: number) => String(value).padStart(2, '0');
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

function build(year: number, month: number, index: number): Invoice {
  const freightPaise = 18_45_617 + index * 3_17_341 + (index % 3) * 1_207;
  const codFeesPaise = 2_36_459 + index * 41_173 + (index % 4) * 53;
  const taxablePaise = freightPaise + codFeesPaise;
  const gstPaise = gstOf(taxablePaise);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return {
    id: `inv-${year}-${pad(month)}`,
    number: `DEMO-INV-${year}-${pad(month)}`,
    periodStart: `${year}-${pad(month)}-01`,
    periodEnd: `${year}-${pad(month)}-${pad(lastDay(year, month))}`,
    shipments: 120 + index * 17,
    freightPaise,
    codFeesPaise,
    taxablePaise,
    gstPaise,
    totalPaise: taxablePaise + gstPaise,
    status: 'paid',
    issuedAt: `${next.year}-${pad(next.month)}-01T04:30:00.000Z`,
  };
}

// January 2025 to October 2026, newest first. Invented figures, so none of them is real.
const MONTHS: Array<[number, number]> = [];
for (let year = 2025; year <= 2026; year += 1) {
  for (let month = 1; month <= 12; month += 1) {
    if (year === 2026 && month > 10) break;
    MONTHS.push([year, month]);
  }
}

/** Sorted newest first. September and October 2026 are still due. */
export const SAMPLE_INVOICES: Invoice[] = MONTHS.map(([year, month], index) => {
  const invoice = build(year, month, index);
  return index >= MONTHS.length - 2 ? { ...invoice, status: 'due' as const } : invoice;
}).reverse();

// A very large month with a long number, so screens are tested with long values at 320px.
(() => {
  const index = SAMPLE_INVOICES.findIndex(({ id }) => id === 'inv-2026-10');
  const base = SAMPLE_INVOICES[index]!;
  const freightPaise = 8_41_20_315_07;
  const codFeesPaise = 62_45_190_93;
  const taxablePaise = freightPaise + codFeesPaise;
  const gstPaise = gstOf(taxablePaise);
  SAMPLE_INVOICES[index] = {
    ...base,
    number: 'DEMO-INV-2026-27-OCT-000000012345',
    shipments: 48_215,
    freightPaise,
    codFeesPaise,
    taxablePaise,
    gstPaise,
    totalPaise: taxablePaise + gstPaise,
  };
})();

export const mockInvoiceService: InvoiceService = {
  async listInvoices({ page, year }) {
    const found = year
      ? SAMPLE_INVOICES.filter(({ periodStart }) => periodStart.startsWith(`${year}-`))
      : SAMPLE_INVOICES;
    const pageCount = Math.max(1, Math.ceil(found.length / INVOICES_PAGE_SIZE));
    const current = Math.min(Math.max(page, 1), pageCount);
    const start = (current - 1) * INVOICES_PAGE_SIZE;

    return fromMock({
      items: found.slice(start, start + INVOICES_PAGE_SIZE),
      page: current,
      pageCount,
    });
  },

  async getInvoice(id) {
    const found = SAMPLE_INVOICES.find((invoice) => invoice.id === id);
    return found
      ? fromMock({ ...found })
      : {
          ok: false,
          source: 'mock',
          error: { kind: 'not_found', status: 404, message: 'Invoice not found.' },
        };
  },
};
