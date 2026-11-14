import { z } from 'zod';

const count = z.number().int().nonnegative().default(0);

/** GET /api/v1/shipments/stats. A status with no shipments may be left out. */
export const ShipmentStatsSchema = z.object({
  CREATE_REQUESTED: count,
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

/** The same route with every timeline field. The timeline runs oldest to newest. */
export const TrackingDetailSchema = TrackingSchema.extend({
  timeline: z.array(
    z.object({
      status: z.string(),
      raw_status: z.string().nullable(),
      location: z.string().nullable(),
      occurred_at: z.string(),
    }),
  ),
});
