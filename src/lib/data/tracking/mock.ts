import { fromMock, type DataResult } from '../source';
import { mockOrdersService } from '../orders/mock';
import { AWB_NOT_FOUND, type TrackingDetail, type TrackingSummary } from './types';

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

const notFound = {
  ok: false,
  source: 'mock',
  error: { kind: 'not_found', status: 0, message: AWB_NOT_FOUND },
} as const;

export const mockTrackingService = {
  async lookup(awb: string): Promise<DataResult<TrackingSummary>> {
    const sample = SAMPLES.find((item) => item.awb === awb);
    return sample ? fromMock(sample) : notFound;
  },

  async getTimeline(awb: string): Promise<DataResult<TrackingDetail>> {
    // The sample orders already carry a timeline, so every sample shipment has one here too.
    const detail = await mockOrdersService.getOrderDetail(awb);
    if (!detail.ok) return notFound;
    const { data } = detail;
    const last = data.timeline.at(-1);
    return fromMock({
      awb: data.awb,
      carrier: data.carrier,
      status: data.status,
      rawStatus: null,
      location: last?.location ?? null,
      lastEventAt: last?.timestamp ?? null,
      timeline: data.timeline
        .map((event) => ({
          status: event.status,
          rawStatus: null,
          location: event.location,
          occurredAt: event.timestamp,
        }))
        .reverse(),
    });
  },
};
