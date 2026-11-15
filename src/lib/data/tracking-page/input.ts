import { z } from 'zod';
import { PHONE_PATTERN } from '../profile/input';
import type { TrackingAccent, TrackingPageBranding } from './types';

export const ACCENTS: TrackingAccent[] = ['primary', 'accent', 'success'];
export const MAX_DISPLAY_NAME = 40;
export const MAX_LOGO_BYTES = 1024 * 1024;
export const LOGO_TYPES = ['image/png', 'image/svg+xml'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_NAME_PATTERN = /^[^\/<>:"|?*\x00-\x1f]{1,120}\.(png|svg)$/i;

export interface LogoFile {
  name: string;
  type: string;
  size: number;
}

/** Null when the logo is fine, otherwise the message to show. Only the name, type and size are checked. */
export function checkLogo(file: LogoFile): string | null {
  if (!LOGO_TYPES.includes(file.type)) return `${file.name} is not a PNG or SVG file.`;
  if (file.size <= 0) return `${file.name} is empty.`;
  if (file.size > MAX_LOGO_BYTES) return `${file.name} is larger than 1 MB.`;
  return null;
}

const BrandingSchema = z.object({
  displayName: z
    .string({ message: 'Enter a display name.' })
    .trim()
    .min(1, 'Enter a display name.')
    .max(MAX_DISPLAY_NAME, `Display name must be at most ${MAX_DISPLAY_NAME} characters.`),
  supportEmail: z
    .string({ message: 'Enter a valid email address.' })
    .trim()
    .max(254, 'Enter a valid email address.')
    .refine((v) => v === '' || EMAIL_PATTERN.test(v), 'Enter a valid email address, such as help@example.com.'),
  supportPhone: z
    .string({ message: 'Enter a valid phone number.' })
    .trim()
    .refine((v) => v === '' || PHONE_PATTERN.test(v), 'Enter 10 to 15 digits, with an optional + at the start.'),
  accent: z.enum(['primary', 'accent', 'success'], { message: 'Choose one of the listed colours.' }),
  showCourier: z.boolean({ message: 'Choose whether to show the courier.' }),
  logoName: z
    .string()
    .regex(LOGO_NAME_PATTERN, 'The logo must be a PNG or SVG file.')
    .nullable(),
});

export type BrandingFieldErrors = Partial<Record<keyof TrackingPageBranding, string>>;

export type BrandingParse =
  | { ok: true; value: TrackingPageBranding }
  | { ok: false; message: string; errors: BrandingFieldErrors };

/** Checks branding on the server. Unknown keys are dropped. Colours are limited to palette tokens. */
export function parseBrandingInput(input: unknown): BrandingParse {
  const parsed = BrandingSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };

  const errors: BrandingFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof TrackingPageBranding | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, message: 'Check the highlighted fields, then try again.', errors };
}
