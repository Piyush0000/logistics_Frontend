import { z } from 'zod';
import type { ProfileInput } from './types';

export const MAX_NAME_LENGTH = 80;
export const MIN_PASSWORD_LENGTH = 8;
export const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;

const ProfileSchema = z.object({
  name: z
    .string({ message: 'Enter your name.' })
    .trim()
    .min(1, 'Enter your name.')
    .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters.`),
  phone: z
    .string({ message: 'Enter your phone number.' })
    .trim()
    .regex(PHONE_PATTERN, 'Enter 10 to 15 digits, with an optional + at the start.'),
});

export type ProfileFieldErrors = Partial<Record<keyof ProfileInput, string>>;

export type ProfileParse =
  | { ok: true; value: ProfileInput }
  | { ok: false; message: string; errors: ProfileFieldErrors };

/** Checks the profile on the server. Unknown keys, such as an email, are dropped. */
export function parseProfileInput(input: unknown): ProfileParse {
  const parsed = ProfileSchema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };

  const errors: ProfileFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof ProfileInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, message: 'Check the highlighted fields, then try again.', errors };
}

export interface PasswordChange {
  current: string;
  next: string;
  confirm: string;
}

export type PasswordFieldErrors = Partial<Record<keyof PasswordChange, string>>;

export type PasswordParse =
  | { ok: true; value: PasswordChange }
  | { ok: false; message: string; errors: PasswordFieldErrors };

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/** Passwords are not trimmed: spaces count. */
export function parsePasswordChange(input: unknown): PasswordParse {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const value: PasswordChange = {
    current: text(raw.current),
    next: text(raw.next),
    confirm: text(raw.confirm),
  };

  const errors: PasswordFieldErrors = {};
  if (value.current === '') errors.current = 'Enter your current password.';
  if (value.next.length < MIN_PASSWORD_LENGTH) {
    errors.next = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (value.next === value.current) {
    errors.next = 'Choose a password different from the current one.';
  }
  if (value.confirm !== value.next) errors.confirm = 'The passwords do not match.';

  return Object.keys(errors).length > 0
    ? { ok: false, message: 'Check the highlighted fields, then try again.', errors }
    : { ok: true, value };
}
