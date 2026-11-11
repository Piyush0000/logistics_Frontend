'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import { checkReply, checkTicket, supportService } from '@/lib/data/support';
import type { DataResult } from '@/lib/data/source';
import type { Ticket } from '@/lib/data/support';

export type TicketActionResult =
  | { ok: true; id: string; message: string }
  | { ok: false; message: string };

const SIGN_IN_AGAIN = 'Sign in again.';

function done(result: DataResult<Ticket>, message: string): TicketActionResult {
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message,
    };
  }
  revalidatePath('/support/tickets');
  revalidatePath(`/support/tickets/${result.data.id}`);
  return { ok: true, id: result.data.id, message };
}

// Server actions can be called directly, so each one checks the session itself.
export async function createTicketAction(input: unknown): Promise<TicketActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const checked = checkTicket(input);
  if (!checked.ok) return { ok: false, message: checked.message };

  return done(await supportService().createTicket(checked.value), 'Ticket raised.');
}

export async function replyAction(id: unknown, body: unknown): Promise<TicketActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  if (typeof id !== 'string' || id === '' || id.length > 100) {
    return { ok: false, message: 'Choose a ticket to reply to.' };
  }
  const checked = checkReply(body);
  if (!checked.ok) return { ok: false, message: checked.message };

  return done(await supportService().reply(id, checked.value), 'Reply sent.');
}
