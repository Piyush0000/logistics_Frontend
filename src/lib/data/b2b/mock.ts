import { fromMock } from '../source';
import { parseB2bInput, totalWeightKg } from './input';
import { B2B_PAGE_SIZE, type B2bService, type B2bShipment } from './types';

const CITIES = ['Mumbai', 'Delhi', 'Chennai', 'Hyderabad', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const NAMES = [
  'Kumar Hardware Traders',
  'Shree Textiles',
  'Patel Agro Supplies',
  'Mehta Electricals',
  'Singh Auto Parts',
  'Rao Medical Distributors',
  'Iyer Stationers',
  'Gupta Packaging',
];
const CARRIERS = ['delhivery', 'bluedart', 'dhl', 'ekart'];
const STATUSES = ['MANIFESTED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'IN_TRANSIT'];

// 22 sample rows, newest first. The first has a very long name and a very large invoice, so
// screens are checked against long values.
const samples: B2bShipment[] = [
  {
    id: 'b2b-001',
    lrNumber: 'LR20260001',
    carrier: 'delhivery',
    status: 'IN_TRANSIT',
    consignee:
      'Bharatiya Rashtriya Audyogik Vitaran Evam Aapurti Sahakari Samiti Maryadit, Regional Office',
    destinationCity: 'Thiruvananthapuram Municipal Corporation Area',
    boxes: 120,
    totalWeightKg: 1840.5,
    invoiceValuePaise: 1_00_00_000 * 100 + 12_345,
    createdAt: '2026-11-09T10:00:00.000Z',
  },
  ...Array.from({ length: 21 }, (_, index): B2bShipment => {
    const n = index + 2;
    return {
      id: `b2b-${String(n).padStart(3, '0')}`,
      lrNumber: `LR2026${String(n).padStart(4, '0')}`,
      carrier: CARRIERS[index % CARRIERS.length] ?? 'delhivery',
      status: STATUSES[index % STATUSES.length] ?? 'MANIFESTED',
      consignee: NAMES[index % NAMES.length] ?? 'Sample Traders',
      destinationCity: CITIES[index % CITIES.length] ?? 'Mumbai',
      boxes: 2 + (index % 9),
      totalWeightKg: 12.5 + index * 7.25,
      invoiceValuePaise: (18_000 + index * 4_700) * 100,
      createdAt: new Date(Date.UTC(2026, 10, 8) - index * 36 * 3_600_000).toISOString(),
    };
  }),
];

let store: B2bShipment[] = [...samples];
let nextLr = 100;

export const mockB2bService: B2bService = {
  async listShipments({ page, search }) {
    const needle = search.trim().toLowerCase();
    const matches = needle
      ? store.filter(
          (row) =>
            row.lrNumber.toLowerCase().includes(needle) ||
            row.consignee.toLowerCase().includes(needle),
        )
      : store;
    const pageCount = Math.max(1, Math.ceil(matches.length / B2B_PAGE_SIZE));
    const current = Math.min(Math.max(page, 1), pageCount);
    const start = (current - 1) * B2B_PAGE_SIZE;
    return fromMock({
      items: matches.slice(start, start + B2B_PAGE_SIZE).map((row) => ({ ...row })),
      page: current,
      pageCount,
      total: matches.length,
    });
  },

  async createShipment(input) {
    const parsed = parseB2bInput(input);
    if (!parsed.ok) {
      return {
        ok: false,
        source: 'mock',
        error: {
          kind: 'validation',
          status: 400,
          message: 'Some fields need attention.',
          issues: Object.entries(parsed.fieldErrors).map(([path, message]) => ({ path, message })),
        },
      };
    }
    const { consignee, boxes, invoiceValuePaise } = parsed.data;
    const created: B2bShipment = {
      id: `b2b-new-${nextLr}`,
      lrNumber: `LR2026${nextLr++}`,
      carrier: CARRIERS[store.length % CARRIERS.length] ?? 'delhivery',
      status: 'MANIFESTED',
      consignee: consignee.name,
      destinationCity: consignee.city,
      boxes: boxes.reduce((sum, box) => sum + box.count, 0),
      totalWeightKg: totalWeightKg(boxes),
      invoiceValuePaise,
      createdAt: new Date().toISOString(),
    };
    store = [created, ...store];
    return fromMock({ ...created });
  },
};
