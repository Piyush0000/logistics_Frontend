import { ArrowLeft, Banknote, CalendarClock, Scale, Wallet } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StatusChip } from '@/components/admin/status-chip';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { StatTile } from '@/components/ui/stat-tile';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminMoneyService, type BankVerification } from '@/lib/admin/data/money';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { codBatchHref, Difference, LINE_MATCH, REMITTANCE_STATUS } from '../cod-display';
import { ReconcileButton, VerifyBankButton } from '../cod-dialogs';
import { ExceptionsList } from '../exceptions-list';

export const metadata: Metadata = { title: 'COD remittance' };

/** A positive whole page number from the URL, or 1. */
function pageFrom(value: string | string[] | undefined): number {
  const text = Array.isArray(value) ? value[0] : value;
  return text && /^[1-9]\d{0,5}$/.test(text) ? Number(text) : 1;
}

const TILE = 'min-w-0 rounded-card border border-secondary bg-surface p-3 lg:p-card';
const BACK_LINK =
  'inline-flex h-11 items-center gap-1.5 rounded-control text-sm font-medium text-on-surface/70 hover:text-primary lg:h-control';

function BankResult({ verification }: { verification: BankVerification }) {
  const { result, variancePaise, bankCreditPaise, utr, verifiedAt } = verification;
  const tone = result === 'verified' ? 'border-success/30 bg-success/10' : 'border-error/30 bg-error/10';
  const text =
    result === 'verified'
      ? 'matches the lines total.'
      : result === 'short'
        ? `is short by ${formatPaise(-variancePaise)}.`
        : `is ${formatPaise(variancePaise)} more than the lines total.`;
  return (
    <p data-testid="cod-bank-result" className={`rounded-control border p-3 text-sm ${tone}`}>
      <span className="font-semibold">Bank {result === 'verified' ? 'verified' : result}:</span> the credit of{' '}
      {formatPaise(bankCreditPaise)} {text}
      <span className="block text-xs text-on-surface/70">
        {utr ? `UTR ${utr} · ` : ''}checked {formatDateTime(verifiedAt)}
      </span>
    </p>
  );
}

// Owner: Teammate 2. See docs/admin/team-split.md.
export default async function AdminCodRemittancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const page = pageFrom((await searchParams).page);
  const result = await adminMoneyService().getRemittance(id, page);
  if (!result.ok && result.error.kind === 'not_found') notFound();

  const back = (
    <Link href="/admin/money" className={BACK_LINK}>
      <ArrowLeft aria-hidden="true" className="size-4" />
      Money
    </Link>
  );

  if (!result.ok) {
    return (
      <>
        {back}
        <PageHeader title="COD remittance" />
        <DataCard testId="admin-cod-lines" title="Lines" result={result}>
          {() => null}
        </DataCard>
      </>
    );
  }

  const { remittance, lines, exceptions } = result.data;
  const [statusLabel, statusTone] = REMITTANCE_STATUS[remittance.status];
  const paid = remittance.status !== 'expected';
  const difference = remittance.receivedPaise - remittance.expectedPaise;
  const pageCount = Math.ceil(lines.total / lines.pageSize);

  return (
    <>
      {back}
      <PageHeader
        title={`Remittance ${remittance.id}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <CarrierBadge carrier={remittance.carrier} />
            <span>
              Deliveries to {formatDate(remittance.periodEnd)} · payout due {formatDate(remittance.dueDate)}
            </span>
            <span data-testid="cod-status">
              <StatusChip tone={statusTone}>{statusLabel}</StatusChip>
            </span>
          </span>
        }
        actions={
          paid ? (
            <>
              <VerifyBankButton remittance={remittance} />
              {/* Kept mounted after reconciling, so its popup can show the result. */}
              <ReconcileButton remittance={remittance} available={!remittance.reconciledAt} />
            </>
          ) : null
        }
      />

      <section aria-label="Batch figures" className="motion-stagger grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:gap-4 xl:grid-cols-4">
        <div className={TILE}>
          <StatTile label="Expected" value={formatPaise(remittance.expectedPaise)} icon={Wallet} tone="primary" />
        </div>
        <div className={TILE}>
          <StatTile label="Received" value={paid ? formatPaise(remittance.receivedPaise) : 'Not paid'} icon={Banknote} tone="success" />
        </div>
        <div className={TILE}>
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid size-11 shrink-0 place-items-center rounded-control ${difference < 0 && paid ? 'bg-error/15 text-error' : 'bg-muted text-primary'}`}>
              <Scale aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm leading-5 text-on-surface/70">Difference</span>
              <span className="block font-mono text-base leading-7 font-medium min-[420px]:text-lg sm:text-xl">
                {paid ? <Difference paise={difference} testId="cod-difference" /> : '—'}
              </span>
            </span>
          </div>
        </div>
        <div className={TILE}>
          <StatTile
            label={remittance.reconciledAt ? 'Reconciled' : 'Lines'}
            value={remittance.reconciledAt ? formatDate(remittance.reconciledAt) : String(remittance.lineCount)}
            icon={CalendarClock}
            tone="warning"
          />
        </div>
      </section>

      {!paid ? (
        <p className="rounded-control border border-secondary bg-surface p-3 text-sm text-on-surface/70">
          The courier has not paid this batch yet, so it cannot be reconciled or checked against the bank.
        </p>
      ) : null}
      {remittance.reconciledAt ? (
        <p data-testid="cod-reconciled-note" className="text-sm text-on-surface/70">
          Reconciled on {formatDateTime(remittance.reconciledAt)}. A batch is reconciled once.
        </p>
      ) : null}
      {remittance.bankVerification ? <BankResult verification={remittance.bankVerification} /> : null}

      {remittance.reconciledAt ? (
        <DataCard testId="admin-cod-batch-exceptions" title="Exceptions in this batch" result={result}>
          {() => <ExceptionsList exceptions={exceptions} showBatch={false} />}
        </DataCard>
      ) : null}

      <DataCard testId="admin-cod-lines" title="Lines" result={result}>
        {() => (
          <>
            <p className="mb-3 text-xs text-on-surface/60">
              {lines.total} COD orders{remittance.utr ? ` · UTR ${remittance.utr}` : ''}
            </p>

            <div className={`${t.wrap} max-lg:hidden`}>
              <table className={t.table}>
                <thead>
                  <tr>
                    <th className={t.th}>AWB</th>
                    <th className={t.th}>Merchant</th>
                    <th className={`${t.th} text-right`}>Expected</th>
                    <th className={`${t.th} text-right`}>Received</th>
                    <th className={`${t.th} text-right`}>Difference</th>
                    <th className={t.th}>Match</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.items.map((line) => {
                    const [label, tone] = LINE_MATCH[line.match];
                    return (
                      <tr key={line.awb} data-testid="admin-cod-line-row" className={t.rowHover}>
                        <td className={`${t.td} font-mono text-xs`}>{line.awb}</td>
                        <td className={`${t.td} text-xs`}>{line.merchantName}</td>
                        <td className={t.tdNumeric}>{formatPaise(line.expectedPaise)}</td>
                        <td className={t.tdNumeric}>{line.receivedPaise === null ? '—' : formatPaise(line.receivedPaise)}</td>
                        <td className={t.tdNumeric}>
                          {line.receivedPaise === null ? '—' : <Difference paise={line.receivedPaise - line.expectedPaise} />}
                        </td>
                        <td className={t.td}>
                          <StatusChip tone={tone}>{label}</StatusChip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="grid gap-3 lg:hidden">
              {lines.items.map((line) => {
                const [label, tone] = LINE_MATCH[line.match];
                return (
                  <li key={line.awb} data-testid="admin-cod-line-card" className="rounded-control border border-secondary p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-sm [overflow-wrap:anywhere]">{line.awb}</span>
                      <StatusChip tone={tone}>{label}</StatusChip>
                    </div>
                    <p className="mt-1 text-xs text-on-surface/70">{line.merchantName}</p>
                    <p className="mt-2 text-sm">
                      <span className="font-mono">{formatPaise(line.expectedPaise)}</span>
                      <span className="text-xs text-on-surface/60"> expected</span>
                      {line.receivedPaise === null ? null : (
                        <>
                          {' · '}
                          <span className="font-mono">{formatPaise(line.receivedPaise)}</span>
                          <span className="text-xs text-on-surface/60"> received </span>
                          {line.receivedPaise !== line.expectedPaise ? (
                            <span className="font-mono">
                              (<Difference paise={line.receivedPaise - line.expectedPaise} />)
                            </span>
                          ) : null}
                        </>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>

            <Pagination
              page={lines.page}
              pageCount={pageCount}
              buildHref={(next) => (next > 1 ? `${codBatchHref(remittance.id)}?page=${next}` : codBatchHref(remittance.id))}
            />
          </>
        )}
      </DataCard>
    </>
  );
}
