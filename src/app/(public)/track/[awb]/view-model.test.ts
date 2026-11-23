import { describe, expect, it } from 'vitest';
import type { TrackingDetail } from '@/lib/data/tracking';
import { PUBLIC_STAGES, parsePublicAwb, stageProgress, toPublicView } from './view-model';

describe('stageProgress', () => {
  it.each([
    ['CREATE_REQUESTED', -1],
    ['CREATED', -1],
    ['PICKUP_SCHEDULED', -1],
    ['MANIFESTED', 0],
    ['IN_TRANSIT', 1],
    ['OUT_FOR_DELIVERY', 2],
    ['DELIVERED', 3],
  ])('%s is a progress state with current stage %i', (status, current) => {
    expect(stageProgress(status)).toEqual({ kind: 'progress', current });
  });

  it.each([
    ['RTO_INITIATED', 'Returning to the sender'],
    ['RTO_DELIVERED', 'Returned to the sender'],
    ['CANCELLED', 'Cancelled'],
    ['FAILED', 'Delivery failed'],
  ])('%s is a stopped state, not a step', (status, message) => {
    const result = stageProgress(status);
    expect(result.kind).toBe('stopped');
    expect(result).toMatchObject({ message: expect.stringContaining(message) });
  });

  it('treats an unknown status as no stage reached', () => {
    expect(stageProgress('SOMETHING_NEW')).toEqual({ kind: 'progress', current: -1 });
  });

  it('lists the four stages in order', () => {
    expect(PUBLIC_STAGES).toEqual(['Manifested', 'In transit', 'Out for delivery', 'Delivered']);
  });
});

describe('toPublicView', () => {
  const detail = {
    awb: 'LIVE123',
    carrier: 'ekart',
    status: 'IN_TRANSIT',
    rawStatus: 'In Transit',
    location: 'Pune',
    lastEventAt: '2026-10-23T10:00:00.000Z',
    timeline: [
      { status: 'IN_TRANSIT', rawStatus: 'x', location: 'Pune', occurredAt: '2026-10-23T10:00:00.000Z' },
    ],
    // Fields a future TrackingDetail might gain. None may reach the page.
    recipientName: 'Aditi Rao',
    phone: '9988776655',
    address: 'Flat 302, Green Glen Layout',
    amountPaise: 249900,
    shipmentId: '10000000-0000-4000-8000-000000000001',
    merchantId: 'm-1',
  } as TrackingDetail;

  it('keeps only the allow-listed fields', () => {
    const view = toPublicView(detail);
    expect(Object.keys(view).sort()).toEqual(['awb', 'branding', 'carrier', 'progress', 'status', 'timeline']);
    expect(Object.keys(view.timeline[0]!).sort()).toEqual(['location', 'occurredAt', 'status']);
    const text = JSON.stringify(view);
    for (const secret of ['Aditi', '9988776655', 'Green Glen', '249900', '10000000', 'm-1']) {
      expect(text).not.toContain(secret);
    }
  });
});

describe('parsePublicAwb', () => {
  it('decodes and trims', () => {
    expect(parsePublicAwb('%20DEMOEK001 ')).toBe('DEMOEK001');
  });
  it('rejects bad encoding, empty and over-long values', () => {
    expect(parsePublicAwb('%E0%A4%A')).toBeNull();
    expect(parsePublicAwb('%20')).toBeNull();
    expect(parsePublicAwb('A'.repeat(41))).toBeNull();
    expect(parsePublicAwb('A'.repeat(40))).toBe('A'.repeat(40));
  });
});
