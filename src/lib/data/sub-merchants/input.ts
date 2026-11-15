import { z } from 'zod';
import { ACCOUNT_PATTERN, GSTIN_PATTERN, IFSC_PATTERN, MAX_NAME_LENGTH } from '../../kyc';
import type { SubMerchantInput } from './types';

const text = (label: string) =>
  z
    .string({ message: `Enter ${label}.` })
    .trim()
    .min(1, `Enter ${label}.`)
    .max(MAX_NAME_LENGTH, `Use at most ${MAX_NAME_LENGTH} characters.`);

const code = (label: string, pattern: RegExp, hint: string) =>
  z.string({ message: `Enter ${label}.` }).trim().toUpperCase().regex(pattern, hint);

const Schema = z.object({
  name: text("the seller's business name"),
  email: z
    .string({ message: "Enter the seller's email." })
    .trim()
    .min(1, "Enter the seller's email.")
    .max(254, 'Use at most 254 characters.')
    .email('Enter a valid email address.'),
  // Blank means no GSTIN, which is allowed.
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .transform((v) => (v === '' ? null : v))
    .refine((v) => v === null || GSTIN_PATTERN.test(v), {
      message: 'Enter a 15-character GSTIN, such as 27AAPFU0939F1ZV, or leave it blank.',
    }),
  bank: z.object({
    holder: text('the account holder name'),
    account: code('the account number', ACCOUNT_PATTERN, 'Enter 9 to 18 digits.'),
    ifsc: code('the IFSC', IFSC_PATTERN, 'Enter an 11-character IFSC with a 0 as the fifth character.'),
  }),
});

/** Keys are field paths such as `name`, `gstin` and `bank.ifsc`. */
export type SubMerchantFieldErrors = Record<string, string>;

export type SubMerchantParse =
  | { ok: true; value: SubMerchantInput }
  | { ok: false; message: string; errors: SubMerchantFieldErrors };

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

/** Shared by the dialog, the server action and the mock, so all apply the same rules. */
export function parseSubMerchantInput(input: unknown): SubMerchantParse {
  const raw = asObject(input);
  const parsed = Schema.safeParse({
    name: raw.name,
    email: raw.email,
    gstin: raw.gstin ?? '',
    bank: asObject(raw.bank),
  });
  if (parsed.success) {
    return { ok: true, value: { ...parsed.data, email: parsed.data.email.toLowerCase() } };
  }
  const errors: SubMerchantFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const path = issue.path.join('.');
    if (path && !errors[path]) errors[path] = issue.message;
  }
  return { ok: false, message: 'Check the highlighted fields, then try again.', errors };
}
