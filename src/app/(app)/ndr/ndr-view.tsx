'use client';

import {
  AlertCircle,
  CheckCircle2,
  PackageMinus,
  RotateCw,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { Gauge } from '@/components/charts/gauge';
import { SegmentBar } from '@/components/charts/segment-bar';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { StatTile, type StatTone } from '@/components/ui/stat-tile';
import { tableStyles } from '@/components/ui/table-styles';
import type { NdrDashboardData, NdrRecord } from '@/lib/data/ndr/types';
import { formatDate } from '@/lib/format/date';
import { NdrActionModal } from './ndr-action-modal';

interface NdrViewProps {
  data: NdrDashboardData;
}

const CARD = 'min-w-0 rounded-card border border-secondary bg-surface';
const CARD_TITLE = 'font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl';
const CHIP = 'inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs leading-4 font-medium';

const REATTEMPT_BUTTON =
  'inline-flex items-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-on-primary transition-[background-color,transform] duration-150 hover:bg-accent active:scale-[.97]';
const RTO_BUTTON =
  'inline-flex items-center gap-1.5 rounded-control border border-secondary bg-surface px-3 text-xs font-medium transition-[background-color,border-color,transform] duration-150 hover:border-error/50 hover:bg-error/10 hover:text-error active:scale-[.97]';

function StatusChip({ status }: { status: NdrRecord['status'] }) {
  switch (status) {
    case 'ACTION_REQUIRED':
      return <span className={`${CHIP} bg-warning/15 font-semibold text-warning`}>Action Required</span>;
    case 'REATTEMPT_REQUESTED':
      return <span className={`${CHIP} bg-muted text-primary`}>Reattempt Scheduled</span>;
    case 'RTO_REQUESTED':
      return <span className={`${CHIP} bg-error/15 text-error`}>RTO Requested</span>;
    case 'DELIVERED':
      return <span className={`${CHIP} bg-success/15 text-success`}>Delivered</span>;
  }
}

function Kpi({ label, value, icon, tone, index }: { label: string; value: number; icon: LucideIcon; tone: StatTone; index: number }) {
  return (
    <div className={`${CARD} p-3 lg:p-card`} style={{ '--i': index } as CSSProperties}>
      {/* Icon above the text on narrow phones, as on Home. */}
      <div className="[&>div]:flex-col [&>div]:items-start min-[420px]:[&>div]:flex-row min-[420px]:[&>div]:items-center">
        <StatTile label={label} value={value} icon={icon} tone={tone} animate />
      </div>
    </div>
  );
}

export function NdrView({ data }: NdrViewProps) {
  const [selectedItem, setSelectedItem] = useState<{
    item: NdrRecord;
    action: 'REATTEMPT' | 'RTO';
  } | null>(null);

  const { kpis } = data;
  const closed = kpis.delivered + kpis.returned;

  return (
    <>
      {/* 4 KPI summary cards */}
      <div data-testid="ndr-kpis" className="motion-stagger grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
        <Kpi index={0} label="Action Required" value={kpis.openNdr} icon={AlertCircle} tone="warning" />
        <Kpi index={1} label="Re-attempted" value={kpis.reattempted} icon={RotateCw} tone="primary" />
        <Kpi index={2} label="NDR Delivered" value={kpis.delivered} icon={CheckCircle2} tone="success" />
        <Kpi index={3} label="NDR Returned" value={kpis.returned} icon={PackageMinus} tone="error" />
      </div>

      {/* Like Home's health row: the outcome gauge beside where the NDRs stand. */}
      <section
        aria-labelledby="ndr-outcomes-title"
        className={`${CARD} motion-rise p-card`}
      >
        <h2 id="ndr-outcomes-title" className={CARD_TITLE}>
          NDR outcomes
        </h2>
        <div className="mt-4 grid items-center gap-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <Gauge
            value={closed > 0 ? (kpis.delivered / closed) * 100 : 0}
            label="Saved after a failed attempt"
            tone="success"
          />
          <div className="grid gap-4">
            <p className="font-mono text-3xl font-medium tracking-tight">
              {(kpis.openNdr + kpis.reattempted + kpis.delivered + kpis.returned).toLocaleString('en-IN')}
              <span className="ml-2 font-body text-sm font-normal text-on-surface/60">failed deliveries</span>
            </p>
            <SegmentBar
              title="NDRs by stage"
              segments={[
                { label: 'Needs action', value: kpis.openNdr, tone: 'warning' },
                { label: 'Re-attempting', value: kpis.reattempted, tone: 'primary' },
                { label: 'Saved', value: kpis.delivered, tone: 'success' },
                { label: 'Returning', value: kpis.returned, tone: 'error' },
              ]}
            />
          </div>
        </div>
      </section>

      <section
        data-testid="ndr-list"
        aria-labelledby="ndr-list-title"
        className={`${CARD} motion-rise p-card`}
      >
        <h2 id="ndr-list-title" className={CARD_TITLE}>
          Failed deliveries
        </h2>

        {/* Desktop Table */}
        <div className={`${tableStyles.wrap} mt-4 hidden lg:block`}>
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th className={tableStyles.th}>AWB / Customer</th>
                <th className={tableStyles.th}>Carrier</th>
                <th className={tableStyles.th}>Failure Reason</th>
                <th className={`${tableStyles.th} text-right`}>Attempts</th>
                <th className={tableStyles.th}>Status</th>
                <th className={tableStyles.th}>Last Attempt</th>
                <th className={`${tableStyles.th} text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id} data-testid="ndr-row" className={tableStyles.rowHover}>
                  <td className={tableStyles.td}>
                    <Link
                      href={`/orders/${item.awb}`}
                      className="font-mono text-sm font-semibold text-primary [overflow-wrap:anywhere] hover:underline"
                    >
                      {item.awb}
                    </Link>
                    <div className="text-xs text-on-surface/70">
                      {item.recipient_name} ({item.destination_city})
                    </div>
                  </td>
                  <td className={tableStyles.td}>
                    <CarrierBadge carrier={item.carrier} />
                  </td>
                  <td className={`${tableStyles.td} max-w-xs text-xs text-on-surface/80`}>
                    <span className="font-medium">{item.reason}</span>
                  </td>
                  <td className={tableStyles.tdNumeric}>{item.attempt_count}</td>
                  <td className={tableStyles.td}>
                    <StatusChip status={item.status} />
                  </td>
                  <td className={`${tableStyles.td} text-xs whitespace-nowrap text-on-surface/70`}>
                    {formatDate(item.last_attempt_at)}
                  </td>
                  <td className={`${tableStyles.td} text-right`}>
                    {item.status === 'ACTION_REQUIRED' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedItem({ item, action: 'REATTEMPT' })}
                          className={`${REATTEMPT_BUTTON} h-8`}
                        >
                          <RotateCw aria-hidden="true" className="size-3.5" />
                          <span>Reattempt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedItem({ item, action: 'RTO' })}
                          className={`${RTO_BUTTON} h-8`}
                        >
                          <Undo2 aria-hidden="true" className="size-3.5" />
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
        <div className="motion-stagger mt-4 grid gap-3 lg:hidden">
          {data.items.map((item, index) => (
            <div
              key={item.id}
              data-testid="ndr-card"
              style={{ '--i': index } as CSSProperties}
              className="flex min-w-0 flex-col gap-3 rounded-card border border-secondary bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/orders/${item.awb}`}
                    className="font-mono text-sm font-semibold text-primary [overflow-wrap:anywhere] hover:underline"
                  >
                    {item.awb}
                  </Link>
                  <div className="text-xs text-on-surface/70 [overflow-wrap:anywhere]">
                    {item.recipient_name} • {item.destination_city}
                  </div>
                </div>
                <StatusChip status={item.status} />
              </div>

              <div className="rounded-control bg-tertiary p-3 text-xs text-on-surface/80">
                <span className="font-semibold text-on-surface">Issue: </span>
                {item.reason}
                <div className="mt-1 text-[11px] text-on-surface/60">
                  Attempt #{item.attempt_count} on {formatDate(item.last_attempt_at)}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-secondary/70 pt-3">
                <CarrierBadge carrier={item.carrier} />

                {item.status === 'ACTION_REQUIRED' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedItem({ item, action: 'REATTEMPT' })}
                      className={`${REATTEMPT_BUTTON} h-11`}
                    >
                      <RotateCw aria-hidden="true" className="size-3.5" />
                      <span>Reattempt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedItem({ item, action: 'RTO' })}
                      className={`${RTO_BUTTON} h-11`}
                    >
                      <Undo2 aria-hidden="true" className="size-3.5" />
                      <span>RTO</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Action Dialog */}
      {selectedItem ? (
        <NdrActionModal
          item={selectedItem.item}
          initialAction={selectedItem.action}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}
    </>
  );
}
