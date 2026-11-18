'use client';

import { CheckCircle2, Loader2, Send, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type {
  AdminTicketDetail,
} from '@/lib/admin/data/support';
import {
  replyTicketAction,
  updateTicketPriorityAction,
  updateTicketStatusAction,
} from './actions';

export function TicketStatusPriorityControls({
  ticket,
}: {
  ticket: AdminTicketDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  const handleStatusChange = (newStatus: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateTicketStatusAction(ticket.id, newStatus);
      if (res.ok) {
        setFeedback({ message: res.message, ok: true });
        router.refresh();
      } else {
        setFeedback({ message: res.message, ok: false });
      }
    });
  };

  const handlePriorityChange = (newPriority: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await updateTicketPriorityAction(ticket.id, newPriority);
      if (res.ok) {
        setFeedback({ message: res.message, ok: true });
        router.refresh();
      } else {
        setFeedback({ message: res.message, ok: false });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
      {feedback && (
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-md ${
            feedback.ok ? 'bg-success/15 text-success' : 'bg-error/15 text-error'
          }`}
        >
          {feedback.message}
        </span>
      )}

      {/* Status control */}
      <div className="flex items-center gap-2">
        <label htmlFor="ticket-status-select" className="text-xs font-semibold text-on-surface/70">
          Status:
        </label>
        <select
          id="ticket-status-select"
          data-testid="admin-ticket-status-select"
          disabled={isPending}
          value={ticket.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-xl border border-outline/20 bg-surface px-3 py-1.5 text-xs font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[38px]"
        >
          <option value="open">Open</option>
          <option value="awaiting_merchant">Awaiting merchant</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Priority control */}
      <div className="flex items-center gap-2">
        <label htmlFor="ticket-priority-select" className="text-xs font-semibold text-on-surface/70">
          Priority:
        </label>
        <select
          id="ticket-priority-select"
          data-testid="admin-ticket-priority-select"
          disabled={isPending}
          value={ticket.priority}
          onChange={(e) => handlePriorityChange(e.target.value)}
          className="rounded-xl border border-outline/20 bg-surface px-3 py-1.5 text-xs font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[38px]"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </div>
    </div>
  );
}

export function TicketReplyForm({
  ticketId,
  isResolved,
}: {
  ticketId: string;
  isResolved: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ message: string; ok: boolean } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed.length < 2) {
      setStatusMessage({ message: 'Reply must be at least 2 characters long.', ok: false });
      return;
    }
    if (trimmed.length > 5000) {
      setStatusMessage({ message: 'Reply cannot exceed 5,000 characters.', ok: false });
      return;
    }

    setStatusMessage(null);
    startTransition(async () => {
      const res = await replyTicketAction(ticketId, trimmed);
      if (res.ok) {
        setMessage('');
        setStatusMessage({
          message: isResolved
            ? 'Reply sent! Ticket has been reopened.'
            : 'Reply sent successfully.',
          ok: true,
        });
        router.refresh();
      } else {
        setStatusMessage({ message: res.message, ok: false });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} data-testid="reply-box" className="space-y-3">
      {statusMessage && (
        <div
          data-testid={statusMessage.ok ? 'admin-ticket-reply-success' : 'admin-ticket-reply-error'}
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
            statusMessage.ok
              ? 'bg-success/15 text-success border border-success/30'
              : 'bg-error/15 text-error border border-error/30'
          }`}
        >
          {statusMessage.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 shrink-0" />
          )}
          <span>{statusMessage.message}</span>
        </div>
      )}

      {isResolved && (
        <div className="rounded-xl bg-warning/10 border border-warning/20 p-3 text-xs text-warning">
          <strong>Note:</strong> This ticket is currently resolved. Sending a reply will automatically reopen it and set its status to <strong>Open</strong>.
        </div>
      )}

      <div className="relative">
        <textarea
          data-testid="admin-ticket-reply-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your response to the merchant... (2 to 5,000 characters, plain text only)"
          rows={4}
          disabled={isPending}
          className="w-full rounded-2xl border border-outline/20 bg-surface p-3.5 text-sm text-on-surface placeholder:text-on-surface/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-sans leading-relaxed resize-y"
        />
        <div className="flex justify-between items-center px-1 pt-1 text-[11px] text-on-surface/50">
          <span>Plain text only (markdown or HTML is not parsed)</span>
          <span className={message.length > 5000 ? 'text-error font-semibold' : ''}>
            {message.length} / 5,000
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          data-testid="admin-ticket-reply-submit"
          disabled={isPending || message.trim().length < 2 || message.trim().length > 5000}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs min-h-[44px]"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending reply...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Send reply to merchant</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
