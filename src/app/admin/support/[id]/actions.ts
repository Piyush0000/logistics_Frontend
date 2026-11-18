'use server';

import { revalidatePath } from 'next/cache';
import {
  adminSupportService,
  ADMIN_TICKET_PRIORITIES,
  ADMIN_TICKET_STATUSES,
  type AdminTicketDetail,
  type AdminTicketPriority,
  type AdminTicketStatus,
} from '@/lib/admin/data/support';
import { requireAdminSession } from '@/lib/admin/session';

export type SupportActionResult =
  | { ok: true; message: string; ticket: AdminTicketDetail }
  | { ok: false; message: string };

export async function replyTicketAction(
  ticketId: unknown,
  message: unknown,
): Promise<SupportActionResult> {
  await requireAdminSession();

  if (typeof ticketId !== 'string' || !ticketId.trim()) {
    return { ok: false, message: 'Invalid ticket identifier.' };
  }

  if (typeof message !== 'string') {
    return { ok: false, message: 'Reply message is required.' };
  }

  const trimmed = message.trim();
  if (trimmed.length < 2 || trimmed.length > 5000) {
    return { ok: false, message: 'Reply message must be between 2 and 5,000 characters.' };
  }

  try {
    const result = await adminSupportService().reply(ticketId.trim(), trimmed);
    if (!result.ok) {
      return { ok: false, message: result.error.message };
    }

    // TODO(audit): recordAudit({ action: 'support_reply', target: ticketId, detail: trimmed.slice(0, 50) })

    revalidatePath('/admin');
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${ticketId}`);

    return {
      ok: true,
      message: 'Reply sent successfully.',
      ticket: result.data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to post reply.';
    return { ok: false, message: msg };
  }
}

export async function updateTicketStatusAction(
  ticketId: unknown,
  status: unknown,
): Promise<SupportActionResult> {
  await requireAdminSession();

  if (typeof ticketId !== 'string' || !ticketId.trim()) {
    return { ok: false, message: 'Invalid ticket identifier.' };
  }

  if (typeof status !== 'string' || !ADMIN_TICKET_STATUSES.includes(status as AdminTicketStatus)) {
    return { ok: false, message: 'Invalid ticket status.' };
  }

  try {
    const result = await adminSupportService().updateTicket(ticketId.trim(), {
      status: status as AdminTicketStatus,
    });
    if (!result.ok) {
      return { ok: false, message: result.error.message };
    }

    // TODO(audit): recordAudit({ action: 'support_status_change', target: ticketId, detail: status })

    revalidatePath('/admin');
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${ticketId}`);

    return {
      ok: true,
      message: `Status updated to ${status}.`,
      ticket: result.data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update ticket status.';
    return { ok: false, message: msg };
  }
}

export async function updateTicketPriorityAction(
  ticketId: unknown,
  priority: unknown,
): Promise<SupportActionResult> {
  await requireAdminSession();

  if (typeof ticketId !== 'string' || !ticketId.trim()) {
    return { ok: false, message: 'Invalid ticket identifier.' };
  }

  if (typeof priority !== 'string' || !ADMIN_TICKET_PRIORITIES.includes(priority as AdminTicketPriority)) {
    return { ok: false, message: 'Invalid ticket priority.' };
  }

  try {
    const result = await adminSupportService().updateTicket(ticketId.trim(), {
      priority: priority as AdminTicketPriority,
    });
    if (!result.ok) {
      return { ok: false, message: result.error.message };
    }

    // TODO(audit): recordAudit({ action: 'support_priority_change', target: ticketId, detail: priority })

    revalidatePath('/admin');
    revalidatePath('/admin/support');
    revalidatePath(`/admin/support/${ticketId}`);

    return {
      ok: true,
      message: `Priority updated to ${priority}.`,
      ticket: result.data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update ticket priority.';
    return { ok: false, message: msg };
  }
}
