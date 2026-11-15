import { describe, expect, it } from 'vitest';
import { awbLabel, orderHref, trackHref } from './awb';

describe('awb helpers', () => {
  it('links by AWB, or by shipment id before an AWB is assigned', () => {
    expect(orderHref({ awb: 'DEMOEK001', shipment_id: 's-1' })).toBe('/orders/DEMOEK001');
    expect(orderHref({ awb: '', shipment_id: 's-1' })).toBe('/orders/s-1');
  });

  it('shows "Not assigned" for an empty AWB', () => {
    expect(awbLabel('')).toBe('Not assigned');
    expect(awbLabel('DEMOEK001')).toBe('DEMOEK001');
  });

  it('opens the tracking tool on one AWB', () => {
    expect(trackHref('DEMO 1')).toBe('/tools/tracking?awb=DEMO%201');
  });
});
