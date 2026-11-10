import { AddressSchema } from '@logicore/contracts';
import { z } from 'zod';
import type { B2bFieldErrors, B2bShipmentInput } from './types';

export { totalWeightKg } from './totals';

const dimension = (label: string) =>
  z.number({ message: `${label} must be a number.` }).min(1, `${label} must be at least 1 cm.`).max(500, `${label} must be at most 500 cm.`);

const BoxSchema = z.object({
  lengthCm: dimension('Length'),
  widthCm: dimension('Width'),
  heightCm: dimension('Height'),
  weightKg: z
    .number({ message: 'Weight must be a number.' })
    .min(0.1, 'Weight must be at least 0.1 kg.')
    .max(1000, 'Weight must be at most 1000 kg.'),
  count: z
    .number({ message: 'Count must be a number.' })
    .int('Count must be a whole number.')
    .min(1, 'Count must be at least 1.')
    .max(999, 'Count must be at most 999.'),
});

const InputSchema = z.object({
  consignee: AddressSchema,
  pickupAddressId: z.string().min(1, 'Choose a pickup address.'),
  boxes: z
    .array(BoxSchema)
    .min(1, 'Add at least one box.')
    .max(50, 'You can add at most 50 boxes.'),
  invoiceNumber: z
    .string()
    .trim()
    .min(1, 'Enter the invoice number.')
    .max(32, 'Invoice number must be at most 32 characters.'),
  invoiceValuePaise: z
    .number({ message: 'Enter the invoice value.' })
    .int('Invoice value must be a whole number of paise.')
    .min(100, 'Invoice value must be at least ₹1.'),
});

/** Checks a create request. Field errors are keyed by path, for example `boxes.0.weightKg`. */
export function parseB2bInput(
  input: unknown,
): { ok: true; data: B2bShipmentInput } | { ok: false; fieldErrors: B2bFieldErrors } {
  const parsed = InputSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: B2bFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join('.') || 'form';
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}
