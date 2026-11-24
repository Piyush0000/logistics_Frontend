import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../auth/credentials';
import { gatewayFetch } from '../gateway/client';
import { fromGateway, type DataResult } from '../data/source';

/** The company printed at the top of every label. */
export const LABEL_COMPANY = 'Evoc Labs Pvt Ltd';

const AddressSchema = z.object({
  name: z.string(),
  phone: z.string(),
  line1: z.string(),
  line2: z.string().optional().nullable(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
});

const LabelSchema = z.object({
  awb: z.string(),
  carrier_awb: z.string(),
  invoice_number: z.string(),
  invoice_date: z.string(),
  reference_id: z.string().nullable(),
  merchant_name: z.string(),
  origin: AddressSchema,
  destination: AddressSchema,
  weight_kg: z.number(),
  dimensions: z.object({ length_cm: z.number(), width_cm: z.number(), height_cm: z.number() }).nullable(),
  items: z.array(z.object({ name: z.string(), quantity: z.number(), unit_price: z.number() })),
  payment_type: z.enum(['COD', 'PREPAID']),
  cod_amount: z.number(),
});

export type ShipmentLabel = z.infer<typeof LabelSchema>;

/** Everything Evoc's own label prints, for the signed-in merchant's shipment. */
export async function shipmentLabel(ref: string): Promise<DataResult<ShipmentLabel>> {
  const token = await merchantCredential('shipments');
  return fromGateway(
    await gatewayFetch(`/api/v1/shipments/${encodeURIComponent(ref)}/label-data`, {
      schema: LabelSchema,
      token,
    }),
  );
}
