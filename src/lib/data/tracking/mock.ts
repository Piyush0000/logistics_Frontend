import { fromMock, type DataResult } from '../source';
import { AWB_NOT_FOUND, type TrackingSummary } from './types';

const SAMPLES: TrackingSummary[] = [
  {
    awb: 'DEMOEK001',
    carrier: 'ekart',
    status: 'IN_TRANSIT',
    rawStatus: 'In Transit',
    location: 'Pune hub',
    lastEventAt: '2026-10-23T10:00:00.000Z',
  },
  {
    awb: 'DEMODL002',
    carrier: 'delhivery',
    status: 'OUT_FOR_DELIVERY',
    rawStatus: 'Out for Delivery',
    location: 'Bengaluru',
    lastEventAt: '2026-10-23T06:00:00.000Z',
  },
];

export const mockTrackingService = {
  async lookup(awb: string): Promise<DataResult<TrackingSummary>> {
    const sample = SAMPLES.find((item) => item.awb === awb);
    if (sample) return fromMock(sample);
    return {
      ok: false,
      source: 'mock',
      error: { kind: 'not_found', status: 0, message: AWB_NOT_FOUND },
    };
  },
};
