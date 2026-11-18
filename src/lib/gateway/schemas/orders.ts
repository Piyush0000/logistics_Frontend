import { z } from 'zod';

export const ShipmentRecordSchema = z.object({
  shipment_id: z.string(),
  reference_id: z.string(),
  carrier: z.string(),
  awb: z.string(),
  status: z.string(),
  created_at: z.string(),
  last_status_at: z.string(),
  stuck: z.boolean(),
});

export type ShipmentRecord = z.output<typeof ShipmentRecordSchema>;

export const ShipmentListResponseSchema = z.object({
  items: z.array(ShipmentRecordSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
});

export type ShipmentListResponse = z.output<typeof ShipmentListResponseSchema>;

/** One shipment as order-engine serialises it (its own list route, not the gateway's demo route). */
const EngineShipmentSchema = z.object({
  id: z.string(),
  reference_id: z.string().nullish(),
  carrier: z.string(),
  awb: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  last_status_at: z.string().nullish(),
  stuck: z.boolean().optional(),
});

/** order-engine's list: `{ shipments, pagination }`, turned into the gateway's `{ items, page, limit, total }`. */
const EngineListResponseSchema = z
  .object({
    shipments: z.array(EngineShipmentSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      total_pages: z.number().int().nonnegative(),
    }),
  })
  .transform(
    ({ shipments, pagination }): ShipmentListResponse => ({
      items: shipments.map((s) => ({
        shipment_id: s.id,
        reference_id: s.reference_id ?? '',
        carrier: s.carrier,
        // No AWB until the courier assigns one; the UI shows "Not assigned" for an empty AWB.
        awb: s.awb ?? '',
        status: s.status,
        created_at: s.created_at,
        last_status_at: s.last_status_at ?? s.updated_at,
        stuck: s.stuck ?? false,
      })),
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
    }),
  );

/** Either list shape the backend can send, always as `{ items, page, limit, total }`. */
export const OrdersPageSchema = z.union([ShipmentListResponseSchema, EngineListResponseSchema]);

/** Parses a shipment list in either backend shape; throws when it is neither. */
export function normaliseOrdersPage(raw: unknown): ShipmentListResponse {
  return OrdersPageSchema.parse(raw);
}


/** POST /api/v1/shipments answers 202 once the request is stored, with the Evoc AWB assigned. */
export const CreateShipmentResponseSchema = z.object({
  shipment_id: z.string().uuid(),
  awb: z.string().nullish(),
  carrier: z.string(),
  status: z.string(),
  duplicate: z.boolean().optional(),
});
