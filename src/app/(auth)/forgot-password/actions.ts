'use server';

import { emailSchema } from '@/lib/auth/login-schema';
import { sessionService } from '@/lib/data/session';
import { SENT_MESSAGE, type ForgotState } from './forgot-state';

/** Public on purpose: a signed-out visitor has to be able to ask for a reset. */
export async function requestPasswordResetAction(
  _state: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const raw = formData.get('email');
  const email = emailSchema.safeParse(typeof raw === 'string' ? raw : '');
  if (!email.success) {
    return { status: 'error', message: email.error.issues[0]?.message ?? 'Enter a valid work email.' };
  }

  const result = await sessionService().requestPasswordReset(email.data);
  if (!result.ok) return { status: 'error', message: result.error.message };

  return { status: 'sent', message: SENT_MESSAGE, demo: result.data.demo };
}
