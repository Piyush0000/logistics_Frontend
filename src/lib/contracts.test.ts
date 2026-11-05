import {
  CARRIERS,
  NormalizedStatus,
  StandardShipmentRequestSchema,
  sampleShipmentRequest,
} from '@logicore/contracts';
import { describe, expect, it } from 'vitest';

describe('vendored backend contracts', () => {
  it('accepts the sample shipment request', () => {
    expect(StandardShipmentRequestSchema.safeParse(sampleShipmentRequest()).success).toBe(true);
  });

  it('rejects a COD shipment with no amount', () => {
    const request = sampleShipmentRequest({ payment_type: 'COD', cod_amount: 0 });

    expect(StandardShipmentRequestSchema.safeParse(request).success).toBe(false);
  });

  it('exposes the carriers and statuses the frontend relies on', () => {
    expect(CARRIERS).toEqual(['delhivery', 'shadowfax', 'bluedart', 'dhl', 'ekart']);
    expect(Object.values(NormalizedStatus)).toHaveLength(9);
  });
});
