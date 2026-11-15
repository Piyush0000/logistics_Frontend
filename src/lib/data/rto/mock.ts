import 'server-only';

import { fromMock } from '../source';
import type { OrderSummary } from '../orders';
import { RTO_PAGE_SIZE, RTO_STAGE_STATUS, type RtoService, type RtoStage } from './types';

function row(
  n: number,
  awb: string,
  status: string,
  carrier: string,
  raw: string,
  lastStatusAt: string,
  reference = `RTO-REF-${n}`,
): OrderSummary {
  return {
    shipment_id: `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    reference_id: reference,
    carrier,
    awb,
    status,
    created_at: '2026-10-12T09:00:00.000Z',
    last_status_at: lastStatusAt,
    stuck: false,
    raw_status: raw,
  };
}

// Three returning shipments (the first has a long AWB and reference) and two back with the seller.
const SAMPLE: OrderSummary[] = [
  row(
    1,
    'DEMORTOVERYLONGAWB01',
    'RTO_INITIATED',
    'delhivery',
    'Return to origin initiated',
    '2026-11-08T10:00:00.000Z',
    'RTO-REFERENCE-WITH-A-VERY-LONG-CUSTOMER-ORDER-NUMBER-0001',
  ),
  row(2, 'DEMOEK102', 'RTO_INITIATED', 'ekart', 'Return in transit', '2026-11-07T15:30:00.000Z'),
  row(3, 'DEMOBD103', 'RTO_INITIATED', 'bluedart', 'Customer refused delivery', '2026-11-06T09:10:00.000Z'),
  row(4, 'DEMODL104', 'RTO_DELIVERED', 'delhivery', 'Returned to seller', '2026-11-03T12:00:00.000Z'),
  row(5, 'DEMOSF105', 'RTO_DELIVERED', 'shadowfax', 'Return received at warehouse', '2026-11-01T16:45:00.000Z'),
];

const SAMPLE_RTO_CHARGES_PAISE = 184500;

function forStage(stage: RtoStage) {
  return SAMPLE.filter((item) => item.status === RTO_STAGE_STATUS[stage]);
}

export const mockRtoService: RtoService = {
  async getSummary() {
    return fromMock({
      inProgress: forStage('in_progress').length,
      delivered: forStage('delivered').length,
      rtoChargesPaise: SAMPLE_RTO_CHARGES_PAISE,
    });
  },

  async listRto({ stage, page }) {
    const all = forStage(stage);
    const start = (page - 1) * RTO_PAGE_SIZE;
    return fromMock({
      items: all.slice(start, start + RTO_PAGE_SIZE),
      page,
      limit: RTO_PAGE_SIZE,
      total: all.length,
    });
  },
};
