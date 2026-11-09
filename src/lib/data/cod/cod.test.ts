import { describe, expect, it } from 'vitest';
import { codService } from '.';
import { remittancesToCsv, SAMPLE_CSV_NOTICE } from './csv';
import { DEFAULT_COD_FILTERS, type CodFilters } from './filters';
import { gatewayCodService } from './gateway';
import { mockCodService, NEXT_BATCH_SIZE, SAMPLE_REMITTANCES } from './mock';
import type { CodRemittance } from './types';

const list = async (filters: Partial<CodFilters> = {}) => {
  const result = await mockCodService.listRemittances({ ...DEFAULT_COD_FILTERS, ...filters });
  if (!result.ok) throw new Error('The sample remittances should not fail');
  return result.data;
};

const pending = SAMPLE_REMITTANCES.filter(({ status }) => status === 'pending');
const settled = SAMPLE_REMITTANCES.filter(({ status }) => status === 'settled');
const sum = (rows: CodRemittance[]) => rows.reduce((total, row) => total + row.remittablePaise, 0);

describe('sample remittances', () => {
  it('are newest first', () => {
    const times = SAMPLE_REMITTANCES.map(({ collectedAt }) => Date.parse(collectedAt));

    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('use whole paise, and remittable is COD less deductions', () => {
    for (const { codPaise, deductionsPaise, remittablePaise } of SAMPLE_REMITTANCES) {
      expect(Number.isInteger(codPaise)).toBe(true);
      expect(Number.isInteger(deductionsPaise)).toBe(true);
      expect(remittablePaise).toBe(codPaise - deductionsPaise);
    }
  });

  it('have a settled date only once settled', () => {
    for (const { status, settledAt } of SAMPLE_REMITTANCES) {
      expect(settledAt === null).toBe(status === 'pending');
    }
  });

  it('use visibly fake references', () => {
    for (const { orderNumber, awb } of SAMPLE_REMITTANCES) {
      expect(orderNumber).toMatch(/^DEMO-/);
      expect(awb).toMatch(/^DEMO/);
    }
  });
});

describe('getSummary', () => {
  it('adds up from the same rows the table shows, and is labelled sample', async () => {
    const result = await mockCodService.getSummary();

    expect(result.source).toBe('mock');
    expect(result).toMatchObject({
      ok: true,
      data: {
        remittedTillDatePaise: sum(settled),
        settledCount: settled.length,
        lastRemittancePaise: settled[0]?.remittablePaise,
        nextBatchPaise: sum(pending.slice(-NEXT_BATCH_SIZE)),
        nextBatchCount: NEXT_BATCH_SIZE,
        totalDuePaise: sum(pending),
        dueCount: pending.length,
      },
    });
  });
});

describe('listRemittances', () => {
  it('returns the first page at the default size', async () => {
    const data = await list();

    expect(data.entries).toHaveLength(20);
    expect(data).toMatchObject({ page: 1, first: 1, last: 20, total: SAMPLE_REMITTANCES.length });
  });

  it('honours the page size', async () => {
    const data = await list({ perPage: 10, page: 2 });

    expect(data.entries[0]).toEqual(SAMPLE_REMITTANCES[10]);
    expect(data).toMatchObject({ first: 11, last: 20 });
  });

  it('moves a page past the end back to the last page', async () => {
    const data = await list({ page: 999 });

    expect(data.page).toBe(data.pageCount);
    expect(data.last).toBe(SAMPLE_REMITTANCES.length);
  });

  it('filters by status', async () => {
    const data = await list({ status: 'pending', perPage: 50 });

    expect(data.entries).toEqual(pending);
  });

  it('filters on the collected day in Indian time', async () => {
    const day = '2026-10-29';
    const data = await list({ from: day, to: day });

    expect(data.entries.map(({ id }) => id)).toEqual(['cod-002']);
  });

  it('is empty when nothing matches', async () => {
    const data = await list({ from: '2020-01-01', to: '2020-01-31' });

    expect(data).toMatchObject({ entries: [], first: 0, last: 0, total: 0, pageCount: 1 });
  });
});

describe('exportRemittances', () => {
  it('returns every matching row, whatever the page', async () => {
    const result = await mockCodService.exportRemittances({
      ...DEFAULT_COD_FILTERS,
      status: 'settled',
      page: 2,
      perPage: 10,
    });

    expect(result).toMatchObject({ ok: true, data: settled });
  });
});

describe('remittancesToCsv', () => {
  const row: CodRemittance = {
    id: 'x',
    orderNumber: 'DEMO-1',
    awb: 'DEMOAWB1',
    courier: 'Delhivery',
    codPaise: 205000,
    deductionsPaise: 3005,
    remittablePaise: 201995,
    status: 'settled',
    collectedAt: '2026-10-05T06:00:00Z',
    settledAt: '2026-10-12T06:00:00Z',
  };

  it('shows rupees without rounding, and dates in full', () => {
    const lines = remittancesToCsv([row], 'gateway').split('\r\n');

    expect(lines[0]).toBe(
      'Order Number,AWB,Courier,COD Amount,Deductions,Remittable,Status,Collected,Settled At',
    );
    expect(lines[1]).toBe(
      'DEMO-1,DEMOAWB1,Delhivery,2050.00,30.05,2019.95,Settled,5 Oct 2026,12 Oct 2026',
    );
  });

  it('leaves an unsettled date blank', () => {
    const csv = remittancesToCsv([{ ...row, status: 'pending', settledAt: null }], 'gateway');

    expect(csv.split('\r\n')[1]).toMatch(/,Pending,5 Oct 2026,$/);
  });

  it('labels sample exports in the file itself', () => {
    expect(remittancesToCsv([row], 'mock').split('\r\n')[0]).toBe(SAMPLE_CSV_NOTICE);
    expect(remittancesToCsv([row], 'gateway')).not.toContain(SAMPLE_CSV_NOTICE);
  });

  it('quotes commas, quotes and new lines', () => {
    const csv = remittancesToCsv([{ ...row, courier: 'A, "B"\nC' }], 'gateway');

    expect(csv).toContain('"A, ""B""\nC"');
  });

  it('stops spreadsheets running a cell as a formula', () => {
    for (const orderNumber of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) {
      const csv = remittancesToCsv([{ ...row, orderNumber }], 'gateway');

      expect(csv.split('\r\n')[1]?.replace(/^"/, '').startsWith(`'${orderNumber.slice(0, 1)}`)).toBe(
        true,
      );
    }
  });
});

describe('gateway COD service', () => {
  it('never passes off missing routes as data', async () => {
    for (const result of [
      await gatewayCodService.getSummary(),
      await gatewayCodService.listRemittances(DEFAULT_COD_FILTERS),
      await gatewayCodService.exportRemittances(DEFAULT_COD_FILTERS),
    ]) {
      expect(result).toMatchObject({ ok: false, source: 'gateway' });
    }
  });
});

describe('codService', () => {
  it('uses sample data until switched', async () => {
    expect((await codService().getSummary()).source).toBe('mock');
  });
});
