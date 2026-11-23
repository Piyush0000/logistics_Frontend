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

/** The gateway leaves out carrier-specific status text, so it reads as null when absent. */
const rawStatus = z
  .string()
  .nullish()
  .transform((value) => value ?? null);

/** GET /api/v1/shipments/:awb/tracking. The timeline runs oldest to newest. */
export const TrackingSchema = z.object({
  awb: z.string(),
  carrier: z.string(),
  status: z.string(),
  raw_status: rawStatus,
  last_event_at: z.string().nullable(),
  timeline: z.array(z.object({ location: z.string().nullable() })),
});

/** The same route with every timeline field. The timeline runs oldest to newest. */
export const TrackingDetailSchema = TrackingSchema.extend({
  timeline: z.array(
    z.object({
      status: z.string(),
      raw_status: rawStatus,
      location: z.string().nullable(),
      occurred_at: z.string(),
    }),
  ),
});

/**
 * GET /api/v1/track/:awb: the public route. Status, place and time only; it never names the
 * merchant, the customer or the courier partner.
 */
export const PublicTrackingSchema = z.object({
  awb: z.string(),
  status: z.string(),
  last_event_at: z.string().nullable(),
  timeline: z.array(
    z.object({ status: z.string(), location: z.string().nullable(), occurred_at: z.string() }),
  ),
  /** What the merchant chose to show customers; null when they set nothing. */
  branding: z
    .object({
      display_name: z.string(),
      support_email: z.string(),
      support_phone: z.string(),
      accent: z.string(),
      carrier: z.string().nullable(),
    })
    .nullable()
    .optional(),
});
