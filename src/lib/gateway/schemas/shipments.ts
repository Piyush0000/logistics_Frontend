import { z } from 'zod';

const count = z.number().int().nonnegative().default(0);

/** GET /api/v1/shipments/stats. A status with no shipments may be left out. */
export const ShipmentStatsSchema = z.object({
  PICKUP_SCHEDULED: count,
  MANIFESTED: count,
  IN_TRANSIT: count,
  OUT_FOR_DELIVERY: count,
  DELIVERED: count,
  RTO_INITIATED: count,
  RTO_DELIVERED: count,
  CANCELLED: count,
  FAILED: count,
  stuck: count,
});

export type ShipmentStats = z.output<typeof ShipmentStatsSchema>;

/** GET /api/v1/shipments/:id/tracking. The timeline runs oldest to newest. */
export const TrackingSchema = z.object({
  awb: z.string(),
  carrier: z.string(),
  status: z.string(),
  raw_status: z.string().nullable(),
  last_event_at: z.string().nullable(),
  timeline: z.array(z.object({ location: z.string().nullable() })),
});
