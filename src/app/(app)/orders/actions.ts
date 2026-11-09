'use server';

import { StandardShipmentRequestSchema } from '@logicore/contracts';
import { redirect } from 'next/navigation';
import { getDemoSession } from '@/lib/auth/session';
import { ordersService } from '@/lib/data/orders';

export interface CreateShipmentFormState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  createdAwb?: string;
}

export async function createShipmentAction(
  _prevState: CreateShipmentFormState,
  formData: FormData,
): Promise<CreateShipmentFormState> {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const rawData = {
    idempotency_key: (formData.get('idempotency_key') as string) || `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reference_id: (formData.get('reference_id') as string) || undefined,
    origin: {
      name: formData.get('origin_name') as string,
      phone: formData.get('origin_phone') as string,
      email: (formData.get('origin_email') as string) || undefined,
      line1: formData.get('origin_line1') as string,
      line2: (formData.get('origin_line2') as string) || undefined,
      city: formData.get('origin_city') as string,
      state: formData.get('origin_state') as string,
      country: 'IN',
      pincode: formData.get('origin_pincode') as string,
    },
    destination: {
      name: formData.get('destination_name') as string,
      phone: formData.get('destination_phone') as string,
      email: (formData.get('destination_email') as string) || undefined,
      line1: formData.get('destination_line1') as string,
      line2: (formData.get('destination_line2') as string) || undefined,
      city: formData.get('destination_city') as string,
      state: formData.get('destination_state') as string,
      country: 'IN',
      pincode: formData.get('destination_pincode') as string,
    },
    weight_kg: Number(formData.get('weight_kg')),
    dimensions: {
      length_cm: Number(formData.get('length_cm')),
      width_cm: Number(formData.get('width_cm')),
      height_cm: Number(formData.get('height_cm')),
    },
    items: [
      {
        name: formData.get('item_name') as string,
        quantity: Number(formData.get('item_quantity')),
        unit_price: Number(formData.get('item_unit_price')),
        sku: (formData.get('item_sku') as string) || undefined,
      },
    ],
    payment_type: formData.get('payment_type') as 'COD' | 'PREPAID',
    cod_amount: formData.get('payment_type') === 'COD' ? Number(formData.get('cod_amount')) : 0,
    preferred_carrier: (formData.get('preferred_carrier') as string) || undefined,
  };

  const parsed = StandardShipmentRequestSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const fieldPath = issue.path.join('.');
      fieldErrors[fieldPath] = issue.message;
    }
    return {
      ok: false,
      message: 'Please check the form for errors',
      fieldErrors,
    };
  }

  const result = await ordersService().createShipment(parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.message || 'Failed to create shipment',
    };
  }

  return {
    ok: true,
    createdAwb: result.data.awb,
  };
}

