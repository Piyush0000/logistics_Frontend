'use client';

import {
  AlertCircle,
  CheckCircle2,
  PackageMinus,
  RotateCw,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import type { NdrDashboardData, NdrRecord } from '@/lib/data/ndr';
import { formatDate } from '@/lib/format/date';
import { NdrActionModal } from './ndr-action-modal';

interface NdrViewProps {
  data: NdrDashboardData;
}

export function NdrView({ data }: NdrViewProps) {
  const [selectedItem, setSelectedItem] = useState<{
    item: NdrRecord;
    action: 'REATTEMPT' | 'RTO';
  } | null>(null);

  const getStatusChip = (status: NdrRecord['status']) => {
    switch (status) {
      case 'ACTION_REQUIRED':
        return (
          <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning">
            Action Required
          </span>
        );
      case 'REATTEMPT_REQUESTED':
        return (
          <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            Reattempt Scheduled
          </span>
        );
      case 'RTO_REQUESTED':
        return (
          <span className="inline-flex items-center rounded-full border border-error/40 bg-error/15 px-2 py-0.5 text-[11px] font-semibold text-error">
            RTO Requested
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
            Delivered
          </span>
        );
    }
  };

  return (
    <div className="grid gap-6">
      {/* 4 KPI summary cards */}
      <div data-testid="ndr-kpis" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        <div className="flex items-center gap-3.5 rounded-card border border-warning/30 bg-warning/10 p-card">
          <div className="grid size-10 place-items-center rounded-full border border-warning bg-surface text-warning">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-on-surface/70">Action Required</span>
            <div className="text-2xl font-bold text-on-surface">{data.kpis.openNdr}</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-card border border-primary/30 bg-primary/5 p-card">
          <div className="grid size-10 place-items-center rounded-full border border-primary bg-surface text-primary">
            <RotateCw className="size-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-on-surface/70">Re-attempted</span>
            <div className="text-2xl font-bold text-on-surface">{data.kpis.reattempted}</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-card border border-success/30 bg-success/10 p-card">
          <div className="grid size-10 place-items-center rounded-full border border-success bg-surface text-success">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-on-surface/70">NDR Delivered</span>
            <div className="text-2xl font-bold text-on-surface">{data.kpis.delivered}</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-card border border-secondary bg-surface p-card">
          <div className="grid size-10 place-items-center rounded-full border border-secondary bg-tertiary text-on-surface/60">
            <PackageMinus className="size-5" />
          </div>
          <div>
            <span className="text-xs font-medium text-on-surface/70">NDR Returned</span>
            <div className="text-2xl font-bold text-on-surface">{data.kpis.returned}</div>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-card border border-secondary bg-surface lg:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-secondary bg-tertiary/50 text-xs font-semibold text-on-surface/70">
              <th className="py-3.5 pr-4 pl-6">AWB / Customer</th>
              <th className="px-4 py-3.5">Carrier</th>
              <th className="px-4 py-3.5">Failure Reason</th>
              <th className="px-4 py-3.5 text-center">Attempts</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Last Attempt</th>
              <th className="py-3.5 pr-6 pl-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary">
            {data.items.map((item) => (
              <tr key={item.id} data-testid="ndr-row" className="hover:bg-tertiary/40">
                <td className="py-4 pr-4 pl-6">
                  <Link
                    href={`/orders/${item.awb}`}
                    className="font-mono text-sm font-semibold text-primary hover:underline"
                  >
                    {item.awb}
                  </Link>
                  <div className="text-xs text-on-surface/70">
                    {item.recipient_name} ({item.destination_city})
                  </div>
                </td>
                <td className="px-4 py-4">
                  <CarrierBadge carrier={item.carrier} />
                </td>
                <td className="px-4 py-4 max-w-xs text-xs text-on-surface/80">
                  <span className="font-medium">{item.reason}</span>
                </td>
                <td className="px-4 py-4 text-center text-xs font-bold text-on-surface">
                  {item.attempt_count}
                </td>
                <td className="px-4 py-4">{getStatusChip(item.status)}</td>
                <td className="px-4 py-4 text-xs text-on-surface/70">
                  {formatDate(item.last_attempt_at)}
                </td>
                <td className="py-4 pr-6 pl-4 text-right">
                  {item.status === 'ACTION_REQUIRED' ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedItem({ item, action: 'REATTEMPT' })}
                        className="inline-flex h-8 items-center gap-1 rounded-control bg-primary px-2.5 text-xs font-medium text-tertiary hover:bg-primary/90"
                      >
                        <RotateCw className="size-3" />
                        <span>Reattempt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedItem({ item, action: 'RTO' })}
                        className="inline-flex h-8 items-center gap-1 rounded-control border border-secondary bg-surface px-2.5 text-xs font-medium text-on-surface hover:border-warning hover:text-warning"
                      >
                        <Undo2 className="size-3" />
                        <span>RTO</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-on-surface/50">Action logged</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="grid gap-3 lg:hidden">
        {data.items.map((item) => (
          <div
            key={item.id}
            data-testid="ndr-card"
            className="flex min-h-[44px] flex-col gap-3 rounded-card border border-secondary bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={`/orders/${item.awb}`}
                  className="font-mono text-sm font-bold text-primary hover:underline"
                >
                  {item.awb}
                </Link>
                <div className="text-xs text-on-surface/70">
                  {item.recipient_name} • {item.destination_city}
                </div>
              </div>
              {getStatusChip(item.status)}
            </div>

            <div className="rounded-control bg-tertiary/60 p-2.5 text-xs text-on-surface/80">
              <span className="font-semibold text-on-surface">Issue: </span>
              {item.reason}
              <div className="mt-1 text-[11px] text-on-surface/60">
                Attempt #{item.attempt_count} on {formatDate(item.last_attempt_at)}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-secondary/50 pt-2">
              <CarrierBadge carrier={item.carrier} />

              {item.status === 'ACTION_REQUIRED' ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedItem({ item, action: 'REATTEMPT' })}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-control bg-primary px-3 text-xs font-semibold text-tertiary"
                  >
                    <RotateCw className="size-3.5" />
                    <span>Reattempt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedItem({ item, action: 'RTO' })}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-control border border-secondary bg-surface px-3 text-xs font-semibold text-on-surface"
                  >
                    <Undo2 className="size-3.5" />
                    <span>RTO</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Action Dialog */}
      {selectedItem ? (
        <NdrActionModal
          item={selectedItem.item}
          initialAction={selectedItem.action}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}
    </div>
  );
}

