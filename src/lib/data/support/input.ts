import { parseAwbQuery } from '@/lib/awb';
import { TICKET_CATEGORIES, type NewTicket } from './types';

export const SUBJECT_MIN = 5;
export const SUBJECT_MAX = 120;
export const BODY_MIN = 20;
export const BODY_MAX = 5000;
export const AWB_MAX = 40;

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Checks and cleans a new ticket. The browser and the server both use it, so they agree. */
export function checkTicket(input: unknown): Checked<NewTicket> {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const subject = text(raw.subject);
  const body = text(raw.body);

  if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
    return { ok: false, message: `The subject must be ${SUBJECT_MIN} to ${SUBJECT_MAX} characters.` };
  }
  const category = TICKET_CATEGORIES.find((entry) => entry === raw.category);
  if (!category) return { ok: false, message: 'Choose a category.' };

  const { awbs } = parseAwbQuery(text(raw.awb));
  if (awbs.length > 1) return { ok: false, message: 'Enter one AWB only.' };
  const awb = awbs[0] ?? null;
  if (awb && awb.length > AWB_MAX) {
    return { ok: false, message: `The AWB can be up to ${AWB_MAX} characters.` };
  }

  if (body.length < BODY_MIN || body.length > BODY_MAX) {
    return { ok: false, message: 'Describe the problem in 20 to 5,000 characters.' };
  }
  return { ok: true, value: { subject, category, awb, body } };
}

export function checkReply(input: unknown): Checked<string> {
  const body = text(input);
  if (body.length < 1 || body.length > BODY_MAX) {
    return { ok: false, message: 'Write a reply of 1 to 5,000 characters.' };
  }
  return { ok: true, value: body };
}
