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

