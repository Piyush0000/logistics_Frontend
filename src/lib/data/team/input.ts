import { emailSchema } from '../../auth/login-schema';
import { isRole, type Role } from './types';

export type InviteFieldErrors = { email?: string; role?: string };

export type InviteParse =
  | { ok: true; value: { email: string; role: Role } }
  | { ok: false; message: string; errors: InviteFieldErrors };

/** Shared by the dialog, the server action and the mock, so all apply the same rules. */
export function parseInvite(input: unknown): InviteParse {
  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const email = emailSchema.safeParse(raw.email);
  const role = raw.role;

  if (email.success && isRole(role)) {
    return { ok: true, value: { email: email.data.toLowerCase(), role } };
  }

  const errors: InviteFieldErrors = {};
  if (!email.success) {
    errors.email = (email.error.issues[0]?.message ?? 'Enter a valid email address.').replace(
      'work email',
      'email address',
    );
  }
  if (!isRole(role)) errors.role = 'Choose a role.';
  return { ok: false, message: errors.email ?? errors.role ?? 'Check the details.', errors };
}
