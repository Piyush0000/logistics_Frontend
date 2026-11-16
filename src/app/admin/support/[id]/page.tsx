import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquare,
  Shield,
  Tag,
  User,
} from 'lucide-react';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { seedMerchant } from '@/lib/admin/data/seed';
import {
  adminSupportService,
  type AdminTicketPriority,
  type AdminTicketStatus,
} from '@/lib/admin/data/support';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDateTime } from '@/lib/format/date';
import { TicketReplyForm, TicketStatusPriorityControls } from './ticket-controls';

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  return { title: `Ticket ${id} · Support` };
}

const STATUS_CONFIG: Record<AdminTicketStatus, { label: string; tone: ChipTone }> = {
  open: { label: 'Open', tone: 'warning' },
  awaiting_merchant: { label: 'Awaiting merchant', tone: 'info' },
  resolved: { label: 'Resolved', tone: 'success' },
};

const PRIORITY_CONFIG: Record<AdminTicketPriority, { label: string; tone: ChipTone }> = {
  high: { label: 'High', tone: 'error' },
  normal: { label: 'Normal', tone: 'neutral' },
  low: { label: 'Low', tone: 'neutral' },
};

export default async function AdminTicketDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await props.params;

  const result = await adminSupportService().getTicket(id);
  if (!result.ok || !result.data) {
    notFound();
  }

  const ticket = result.data;
  const merchant = seedMerchant(ticket.merchantId);
  const statusConf = STATUS_CONFIG[ticket.status] || {
    label: ticket.status,
    tone: 'neutral' as ChipTone,
  };
  const priorityConf = PRIORITY_CONFIG[ticket.priority] || {
    label: ticket.priority,
    tone: 'neutral' as ChipTone,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <div>
        <Link
          href="/admin/support"
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface/70 hover:text-primary transition-colors min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to support tickets</span>
        </Link>
      </div>

      {/* Ticket Header Card */}
      <div className="rounded-2xl border border-outline/20 bg-surface p-6 shadow-xs space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md">
                {ticket.id}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-surface-elevated px-2.5 py-0.5 text-xs font-medium text-on-surface/80 border border-outline/10">
                <Tag className="h-3 w-3 text-on-surface/50" />
                {ticket.category}
              </span>
              <span data-testid="admin-ticket-priority-chip">
                <StatusChip tone={priorityConf.tone}>{priorityConf.label}</StatusChip>
              </span>
              <span data-testid="admin-ticket-status-chip">
                <StatusChip tone={statusConf.tone}>{statusConf.label}</StatusChip>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              {ticket.subject}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-on-surface/60">
              <Calendar className="h-3.5 w-3.5" />
              <span>Last updated: {formatDateTime(ticket.updatedAt)}</span>
            </div>
          </div>

          {/* Status & Priority Switchers */}
          <TicketStatusPriorityControls ticket={ticket} />
        </div>
      </div>

      {/* Grid: Merchant Info + Ticket Summary */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Merchant Info Card */}
        <div className="md:col-span-1 rounded-2xl border border-outline/20 bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-outline/10">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-on-surface">Merchant Details</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div>
              <span className="text-on-surface/50">Merchant Name:</span>
              <div data-testid="admin-ticket-merchant-name" className="font-semibold text-sm text-on-surface">{ticket.merchantName}</div>
            </div>

            <div>
              <span className="text-on-surface/50">Merchant ID:</span>
              <div className="font-mono text-on-surface/80">{ticket.merchantId}</div>
            </div>

            {merchant?.email && (
              <div className="flex items-center gap-1.5 text-on-surface/70">
                <Mail className="h-3.5 w-3.5 text-on-surface/50 shrink-0" />
                <span className="truncate">{merchant.email}</span>
              </div>
            )}

            {merchant?.city && (
              <div className="flex items-center gap-1.5 text-on-surface/70">
                <MapPin className="h-3.5 w-3.5 text-on-surface/50 shrink-0" />
                <span>{merchant.city}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-outline/10 space-y-2">
            <Link
              href={`/admin/merchants/${ticket.merchantId}`}
              className="flex items-center justify-between w-full rounded-xl bg-surface-elevated px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors min-h-[44px]"
            >
              <span>View merchant profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <Link
              href={`/admin/support?merchant=${ticket.merchantId}`}
              className="flex items-center justify-between w-full rounded-xl border border-outline/20 px-3 py-2 text-xs font-medium text-on-surface/80 hover:bg-surface-elevated transition-colors min-h-[44px]"
            >
              <span>All tickets from merchant</span>
              <MessageSquare className="h-3.5 w-3.5 text-on-surface/50" />
            </Link>
          </div>
        </div>

        {/* Conversation Thread Card */}
        <div className="md:col-span-2 rounded-2xl border border-outline/20 bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline/10">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-on-surface">Conversation Thread</h2>
            </div>
            <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs font-medium text-on-surface/70 border border-outline/10">
              {ticket.messages.length} {ticket.messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          <div data-testid="ticket-thread" className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {ticket.messages.map((msg) => {
              const isAdmin = msg.sender === 'admin';
              return (
                <div
                  key={msg.id}
                  data-testid="admin-ticket-message"
                  className={`flex gap-3 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                >
                  {!isAdmin && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary text-xs font-bold">
                      <User className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 shadow-2xs space-y-1.5 ${
                      isAdmin
                        ? 'bg-primary/10 border border-primary/20 text-on-surface'
                        : 'bg-surface-elevated border border-outline/20 text-on-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-semibold flex items-center gap-1">
                        {isAdmin && <Shield className="h-3.5 w-3.5 text-primary inline" />}
                        {msg.senderName}
                      </span>
                      <span className="text-[11px] text-on-surface/60">
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>

                    {/* Plain text only - never rendered as HTML */}
                    <p className="whitespace-pre-wrap font-sans text-sm text-on-surface leading-relaxed break-words">
                      {msg.body}
                    </p>
                  </div>

                  {isAdmin && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">
                      <Shield className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reply Box */}
          <div className="pt-4 border-t border-outline/10">
            <h3 className="text-xs font-semibold text-on-surface mb-2">Write a response</h3>
            <TicketReplyForm ticketId={ticket.id} isResolved={ticket.status === 'resolved'} />
          </div>
        </div>
      </div>
    </div>
  );
}
