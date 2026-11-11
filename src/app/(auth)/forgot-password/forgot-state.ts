export type ForgotState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'sent'; message: string; demo: boolean };

export const IDLE: ForgotState = { status: 'idle' };

/** Shown for every valid email, so the page never reveals which accounts exist. */
export const SENT_MESSAGE = 'If an account exists for this email, a reset link is on its way.';
export const DEMO_NOTE = 'Demo mode: no email is sent.';
