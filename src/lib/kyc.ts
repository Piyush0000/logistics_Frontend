import { AddressSchema, type Address } from '@logicore/contracts';
import { z } from 'zod';

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_PATTERN = /^[0-9]{9,18}$/;

export type KycStatus = 'not_started' | 'submitted' | 'verified' | 'rejected';
export type DocumentKind = 'gst' | 'pan' | 'cheque';

export interface CompanyDetails {
  legalName: string;
  brandName: string;
  gstin: string;
  pan: string;
  address: Address;
  bank: { holder: string; account: string; ifsc: string };
}

/** What the browser sends about a chosen file. The file itself is never sent to a server action. */
export interface DocumentFile {
  kind: DocumentKind;
  name: string;
  type: string;
  size: number;
}

export const MAX_NAME_LENGTH = 120;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export const DOCUMENT_KINDS: { kind: DocumentKind; label: string }[] = [
  { kind: 'gst', label: 'GST certificate' },
  { kind: 'pan', label: 'PAN card' },
  { kind: 'cheque', label: 'Cancelled cheque' },
];

export const KYC_STATUS_LABEL: Record<KycStatus, string> = {
  not_started: 'Not started',
  submitted: 'Submitted for review',
  verified: 'Verified',
  rejected: 'Rejected',
};

/** Shows only the last 4 digits of an account number. */
export function maskAccount(account: string): string {
  const keep = account.length > 4 ? 4 : 0;
  return '*'.repeat(account.length - keep) + account.slice(account.length - keep);
}

const text = (label: string, max = MAX_NAME_LENGTH) =>
  z
    .string({ message: `Enter ${label}.` })
    .trim()
    .min(1, `Enter ${label}.`)
    .max(max, `Use at most ${max} characters.`);

const code = (label: string, pattern: RegExp, hint: string) =>
  z
    .string({ message: `Enter ${label}.` })
    .trim()
    .toUpperCase()
    .regex(pattern, hint);

const CompanySchema = z.object({
  legalName: text('your legal business name'),
  brandName: text('your brand name'),
  gstin: code('your GSTIN', GSTIN_PATTERN, 'Enter a 15-character GSTIN, such as 27AAPFU0939F1ZV.'),
  pan: code('your PAN', PAN_PATTERN, 'Enter a 10-character PAN, such as AAPFU0939F.'),
  address: AddressSchema,
  bank: z.object({
    holder: text('the account holder name'),
    account: code('the account number', ACCOUNT_PATTERN, 'Enter 9 to 18 digits.'),
    ifsc: code('the IFSC', IFSC_PATTERN, 'Enter an 11-character IFSC with a 0 as the fifth character.'),
  }),
});

/** Keys are field paths such as `gstin`, `address.pincode` and `bank.ifsc`. */
export type CompanyFieldErrors = Record<string, string>;

export type CompanyParse =
  | { ok: true; value: CompanyDetails }
  | { ok: false; message: string; errors: CompanyFieldErrors };

const asObject = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

/** Checks company details on the server. Unknown keys are dropped. */
export function parseCompanyInput(input: unknown): CompanyParse {
  const raw = asObject(input);
  const address = { ...asObject(raw.address) };
  // The form sends an empty second line when it is left blank.
  if (typeof address.line2 === 'string' && address.line2.trim() === '') delete address.line2;
  const parsed = CompanySchema.safeParse({ ...raw, address });
  if (parsed.success) return { ok: true, value: parsed.data };

  const errors: CompanyFieldErrors = {};
  for (const issue of parsed.error.issues) {
    // The contract's pincode rule is set on the whole address, so it is shown under the pincode.
    const path = issue.path.length === 1 && issue.path[0] === 'address' ? 'address.pincode' : issue.path.join('.');
    if (path && !errors[path]) errors[path] = issue.message;
  }
  return { ok: false, message: 'Check the highlighted fields, then try again.', errors };
}

const labelOf = (kind: DocumentKind) => DOCUMENT_KINDS.find((entry) => entry.kind === kind)!.label;

/**
 * Null when the documents are fine, else what to tell the merchant. A kind already on file does
 * not need a new file. Runs in the browser and on the server.
 */
export function checkDocuments(
  documents: readonly DocumentFile[],
  onFile: readonly DocumentKind[] = [],
): string | null {
  for (const { kind } of DOCUMENT_KINDS) {
    if (documents.filter((doc) => doc.kind === kind).length > 1) {
      return `Add only one file for the ${labelOf(kind)}.`;
    }
  }
  for (const doc of documents) {
    if (!(DOCUMENT_TYPES as readonly string[]).includes(doc.type)) {
      return `${doc.name} is not a PDF, JPG or PNG file.`;
    }
    if (doc.size <= 0) return `${doc.name} is empty.`;
    if (doc.size > MAX_DOCUMENT_BYTES) return `${doc.name} is larger than 5 MB.`;
  }
  for (const { kind, label } of DOCUMENT_KINDS) {
    if (!onFile.includes(kind) && !documents.some((doc) => doc.kind === kind)) {
      return `Add the ${label}.`;
    }
  }
  return null;
}

/** Parses the document list a server action received, dropping anything that is not a file entry. */
export function parseDocuments(input: unknown): DocumentFile[] | null {
  if (!Array.isArray(input)) return null;
  const kinds = DOCUMENT_KINDS.map((entry) => entry.kind) as string[];
  const out: DocumentFile[] = [];
  for (const item of input) {
    const doc = asObject(item);
    if (
      typeof doc.kind !== 'string' ||
      !kinds.includes(doc.kind) ||
      typeof doc.name !== 'string' ||
      typeof doc.type !== 'string' ||
      typeof doc.size !== 'number' ||
      !Number.isFinite(doc.size)
    ) {
      return null;
    }
    out.push({ kind: doc.kind as DocumentKind, name: doc.name.slice(0, 200), type: doc.type, size: doc.size });
  }
  return out;
}
