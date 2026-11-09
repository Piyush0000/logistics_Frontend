import { fromMock, type DataResult } from '../source';
import type { NdrActionInput, NdrDashboardData, NdrRecord, NdrService } from './types';

const INITIAL_NDR_RECORDS: NdrRecord[] = [
  {
    id: 'ndr-001',
    shipment_id: '10000000-0000-4000-8000-000000000002',
    awb: 'DEMODL002',
    reference_id: 'DEMO-002',
    carrier: 'delhivery',
    recipient_name: 'Vikram Mehta',
    recipient_phone: '9811223344',
    destination_city: 'Gurugram',
    attempt_count: 1,
    last_attempt_at: '2026-10-23T06:00:00.000Z',
    reason: 'Customer requested future delivery date',
    raw_status: 'CUST_RESCHEDULED',
    status: 'ACTION_REQUIRED',
    history: [
      {
        action: 'Delivery Attempted',
        timestamp: '2026-10-23T06:00:00.000Z',
        note: 'Customer not at premises, asked to deliver tomorrow',
      },
    ],
  },
  {
    id: 'ndr-002',
    shipment_id: '10000000-0000-4000-8000-000000000006',
    awb: 'DEMODH006',
    reference_id: 'DEMO-006',
    carrier: 'dhl',
    recipient_name: 'Sunil Verma',
    recipient_phone: '9855667788',
    destination_city: 'Noida',
    attempt_count: 2,
    last_attempt_at: '2026-10-20T07:00:00.000Z',
    reason: 'Door locked / Premise closed',
    raw_status: 'DOOR_LOCKED',
    status: 'ACTION_REQUIRED',
    history: [
      {
        action: 'Attempt 1',
        timestamp: '2026-10-19T08:00:00.000Z',
        note: 'Gate locked, security refused entry',
      },
      {
        action: 'Attempt 2',
        timestamp: '2026-10-20T07:00:00.000Z',
        note: 'Customer phone unreachable',
      },
    ],
  },
  {
    id: 'ndr-003',
    shipment_id: '10000000-0000-4000-8000-000000000009',
    awb: 'DEMOSF009',
    reference_id: 'DEMO-009',
    carrier: 'shadowfax',
    recipient_name: 'Anjali Sharma',
    recipient_phone: '9877112233',
    destination_city: 'Pune',
    attempt_count: 1,
    last_attempt_at: '2026-10-22T14:30:00.000Z',
    reason: 'Incorrect / Incomplete delivery address',
    raw_status: 'INCOMPLETE_ADDRESS',
    status: 'REATTEMPT_REQUESTED',
    history: [
      {
        action: 'Attempt 1',
        timestamp: '2026-10-22T14:30:00.000Z',
        note: 'House number missing',
      },
      {
        action: 'Reattempt Requested',
        timestamp: '2026-10-23T09:00:00.000Z',
        note: 'Address updated with Flat 401 landmark',
      },
    ],
  },
  {
    id: 'ndr-004',
    shipment_id: '10000000-0000-4000-8000-000000000010',
    awb: 'DEMOBD010',
    reference_id: 'DEMO-010',
    carrier: 'bluedart',
    recipient_name: 'Rajesh Nair',
    recipient_phone: '9844332211',
    destination_city: 'Kochi',
    attempt_count: 2,
    last_attempt_at: '2026-10-21T11:00:00.000Z',
    reason: 'Customer refused delivery (COD amount mismatch)',
    raw_status: 'REFUSED_BY_CUSTOMER',
    status: 'RTO_REQUESTED',
    history: [
      {
        action: 'Attempt 1',
        timestamp: '2026-10-20T10:00:00.000Z',
        note: 'Customer refused cash payment',
      },
      {
        action: 'RTO Initiated',
        timestamp: '2026-10-21T11:30:00.000Z',
        note: 'Merchant opted for return to seller',
      },
    ],
  },
];

const ndrStore: NdrRecord[] = [...INITIAL_NDR_RECORDS];

export const mockNdrService: NdrService = {
  async getNdrDashboard(): Promise<DataResult<NdrDashboardData>> {
    const openNdr = ndrStore.filter((r) => r.status === 'ACTION_REQUIRED').length;
    const reattempted = ndrStore.filter((r) => r.status === 'REATTEMPT_REQUESTED').length;
    const returned = ndrStore.filter((r) => r.status === 'RTO_REQUESTED').length;
    const delivered = ndrStore.filter((r) => r.status === 'DELIVERED').length;

    return fromMock({
      kpis: {
        openNdr,
        reattempted,
        delivered,
        returned,
      },
      items: [...ndrStore],
    });
  },

  async takeNdrAction(input: NdrActionInput): Promise<DataResult<NdrRecord>> {
    const item = ndrStore.find((r) => r.id === input.ndr_id);
    if (!item) {
      return {
        ok: false,
        source: 'mock',
        error: { kind: 'not_found', status: 404, message: `NDR record ${input.ndr_id} not found` },
      };
    }

    const now = new Date().toISOString();
    if (input.action === 'REATTEMPT') {
      item.status = 'REATTEMPT_REQUESTED';
      item.history.push({
        action: 'Reattempt Requested',
        timestamp: now,
        note: input.instructions || (input.preferred_date ? `Preferred date: ${input.preferred_date}` : undefined),
      });
    } else if (input.action === 'RTO') {
      item.status = 'RTO_REQUESTED';
      item.history.push({
        action: 'RTO Requested',
        timestamp: now,
        note: input.instructions || 'Merchant requested Return To Origin',
      });
    }

    return fromMock(item);
  },
};
