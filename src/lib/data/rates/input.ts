import { DimensionsSchema, ServiceabilityRequestSchema } from '@logicore/contracts';
import type { QuoteInput } from './types';

export const MAX_WEIGHT_KG = 1000;
export const MAX_COD_RUPEES = 10_000_000;

export type QuoteField =
  | 'originPincode'
  | 'destinationPincode'
  | 'weightKg'
  | 'lengthCm'
  | 'widthCm'
  | 'heightCm'
  | 'codAmount';
export type QuoteFieldErrors = Partial<Record<QuoteField, string>>;

export type QuoteParse =
  | { ok: true; value: QuoteInput }
  | { ok: false; message: string; errors: QuoteFieldErrors };

// The contract's snake_case names, mapped to the form's.
const FIELD_OF: Record<string, QuoteField> = {
  origin_pincode: 'originPincode',
  destination_pincode: 'destinationPincode',
  weight_kg: 'weightKg',
  length_cm: 'lengthCm',
  width_cm: 'widthCm',
  height_cm: 'heightCm',
  cod_amount: 'codAmount',
};

const MESSAGES: Record<QuoteField, string> = {
  originPincode: 'Enter a 6-digit pincode that does not start with 0.',
  destinationPincode: 'Enter a 6-digit pincode that does not start with 0.',
  weightKg: `Enter a weight above 0 and up to ${MAX_WEIGHT_KG} kg.`,
  lengthCm: 'Enter a length above 0 and up to 500 cm.',
  widthCm: 'Enter a width above 0 and up to 500 cm.',
  heightCm: 'Enter a height above 0 and up to 500 cm.',
  codAmount: 'Enter the amount to collect, above 0 rupees.',
};

const PINCODE = /^[1-9][0-9]{5}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Checks a quote request against the contract's ServiceabilityRequestSchema and DimensionsSchema,
 * which use snake_case, then returns it in the app's camelCase shape with the COD amount in paise.
 */
export function parseQuoteInput(input: unknown): QuoteParse {
  if (!isRecord(input)) {
    return { ok: false, message: 'Fill in the form and try again.', errors: {} };
  }
  const errors: QuoteFieldErrors = {};
  const cod = input.paymentType === 'COD';

  const request = ServiceabilityRequestSchema.safeParse({
    origin_pincode: input.originPincode,
    destination_pincode: input.destinationPincode,
    weight_kg: input.weightKg,
    payment_type: input.paymentType,
    cod_amount: cod ? input.codAmount : undefined,
  });
  const dimensions = DimensionsSchema.safeParse({
    length_cm: input.lengthCm,
    width_cm: input.widthCm,
    height_cm: input.heightCm,
  });

  const issues = [...(request.success ? [] : request.error.issues), ...(dimensions.success ? [] : dimensions.error.issues)];
  for (const issue of issues) {
    const field = FIELD_OF[String(issue.path[0])];
    if (field) errors[field] = MESSAGES[field];
  }
  if (!request.success && issues.some((issue) => issue.path[0] === 'payment_type')) {
    return { ok: false, message: 'Choose prepaid or cash on delivery.', errors };
  }

  if (request.success && dimensions.success) {
    const r = request.data;
    if (!PINCODE.test(r.origin_pincode)) errors.originPincode = MESSAGES.originPincode;
    if (!PINCODE.test(r.destination_pincode)) errors.destinationPincode = MESSAGES.destinationPincode;
    if (r.weight_kg > MAX_WEIGHT_KG) errors.weightKg = MESSAGES.weightKg;
    if (r.payment_type === 'COD' && (!r.cod_amount || r.cod_amount > MAX_COD_RUPEES)) {
      errors.codAmount = MESSAGES.codAmount;
    }
    if (Object.keys(errors).length === 0) {
      const d = dimensions.data;
      return {
        ok: true,
        value: {
          originPincode: r.origin_pincode,
          destinationPincode: r.destination_pincode,
          weightKg: r.weight_kg,
          dimensions: { lengthCm: d.length_cm, widthCm: d.width_cm, heightCm: d.height_cm },
          paymentType: r.payment_type,
          ...(r.payment_type === 'COD' ? { codAmountPaise: Math.round((r.cod_amount ?? 0) * 100) } : {}),
        },
      };
    }
  }
  return { ok: false, message: 'Check the highlighted fields and try again.', errors };
}
