import { ArrowLeft, ArrowUpRight, CreditCard, Mail, MapPin, Package, Phone, ShieldCheck, Ticket } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SegmentBar } from '@/components/charts/segment-bar';
import type { Tone } from '@/components/charts/tone';
import { StatusChip, type ChipTone } from '@/components/admin/status-chip';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { adminMerchantsService, type KycStatus, type MerchantStatus } from '@/lib/admin/data/merchants';
import { adminMoneyService } from '@/lib/admin/data/money';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { MerchantStatusButton } from './status-dialog';

const STATUS_TONE: Record<MerchantStatus, ChipTone> = { active: 'success', pending: 'warning', suspended: 'error' };
const KYC_LABEL: Record<KycStatus, [string, ChipTone]> = {
  not_started: ['Not started', 'neutral'],
  submitted: ['In review', 'warning'],
  approved: ['Approved', 'success'],
  rejected: ['Rejected', 'error'],
};

const SHIPMENT_STATUS_TONE: Record<string, Tone> = {
  DELIVERED: 'success',
  IN_TRANSIT: 'primary',
  RTO_INITIATED: 'warning',
  FAILED: 'error',
};

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  DELIVERED: 'Delivered',
  IN_TRANSIT: 'In Transit',
  RTO_INITIATED: 'RTO in Progress',
  FAILED: 'Failed',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Merchant ${id}` };
}

export default async function AdminMerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;

  const [merchantResult, walletResult] = await Promise.all([
    adminMerchantsService().getMerchant(id),
    adminMoneyService().getMerchantWallet(id),
  ]);

  if (!merchantResult.ok && merchantResult.error.kind === 'not_found') {
    notFound();
  }

  return (
    <>
      <div className="mb-2">
        <Link
          href="/admin/merchants"
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:underline lg:min-h-control"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          <span>Back to merchants</span>
        </Link>
      </div>

      <DataCard testId="admin-merchant-detail-header" title="Merchant" result={merchantResult}>
        {(merchant) => {
          const [kycLabel, kycTone] = KYC_LABEL[merchant.kyc];
          return (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <PageHeader
                  title={merchant.name}
                  description={`ID: ${merchant.id} · Joined ${formatDate(merchant.joinedAt)}`}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusChip tone={STATUS_TONE[merchant.status]}>{merchant.status}</StatusChip>
                  <StatusChip tone={kycTone}>{kycLabel}</StatusChip>
                </div>
              </div>

              <div>
                <MerchantStatusButton
                  merchantId={merchant.id}
                  merchantName={merchant.name}
                  currentStatus={merchant.status}
                />
              </div>
            </div>
          );
        }}
      </DataCard>

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start">
        {/* Left Column: Profile, Shipments Breakdown, Notes */}
        <div className="grid min-w-0 gap-4 lg:gap-5">
          {/* Profile details */}
          <DataCard testId="admin-merchant-profile" title="Merchant profile" result={merchantResult}>
            {(merchant) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-2.5 rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                  <Mail aria-hidden="true" className="size-4 shrink-0 text-on-surface/50 mt-0.5" />
                  <div>
                    <span className="text-xs text-on-surface/60">Email</span>
                    <div className="font-medium text-sm text-on-surface">{merchant.email}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                  <Phone aria-hidden="true" className="size-4 shrink-0 text-on-surface/50 mt-0.5" />
                  <div>
                    <span className="text-xs text-on-surface/60">Phone</span>
                    <div className="font-medium text-sm text-on-surface">{merchant.phone}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                  <MapPin aria-hidden="true" className="size-4 shrink-0 text-on-surface/50 mt-0.5" />
                  <div>
                    <span className="text-xs text-on-surface/60">City</span>
                    <div className="font-medium text-sm text-on-surface">{merchant.city}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                  <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-on-surface/50 mt-0.5" />
                  <div>
                    <span className="text-xs text-on-surface/60">GSTIN</span>
                    <div className="font-mono text-sm text-on-surface">{merchant.gstin || 'Not provided'}</div>
                  </div>
                </div>
              </div>
            )}
          </DataCard>

          {/* Shipments breakdown */}
          <DataCard testId="admin-merchant-shipments" title="Shipments (last 30 days)" result={merchantResult}>
            {(merchant) => (
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-on-surface/60">Total booked</span>
                    <div className="font-heading text-xl font-bold text-on-surface">
                      {merchant.shipments30d.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <Link
                    href={`/admin/shipments?merchantId=${merchant.id}`}
                    className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary hover:underline lg:min-h-control"
                  >
                    <span>View all shipments</span>
                    <ArrowUpRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </div>

                {merchant.shipmentsByStatus.length === 0 ? (
                  <EmptyState message="No shipments recorded in the last 30 days." />
                ) : (
                  <SegmentBar
                    title="Shipment distribution"
                    segments={merchant.shipmentsByStatus.map((item) => ({
                      label: SHIPMENT_STATUS_LABEL[item.status] || item.status,
                      value: item.count,
                      tone: SHIPMENT_STATUS_TONE[item.status] || 'series2',
                    }))}
                  />
                )}
              </div>
            )}
          </DataCard>

          {/* Operational notes */}
          <DataCard testId="admin-merchant-notes" title="Operational notes" result={merchantResult}>
            {(merchant) =>
              merchant.notes.length === 0 ? (
                <p className="text-xs text-on-surface/60">No operational notes recorded for this merchant.</p>
              ) : (
                <ul className="grid gap-2">
                  {merchant.notes.map((note, index) => (
                    <li
                      key={index}
                      className="rounded-control border border-secondary/60 bg-tertiary/40 p-3 text-xs text-on-surface/80"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              )
            }
          </DataCard>
        </div>

        {/* Right Column: Wallet Tile & Quick Links */}
        <div className="grid min-w-0 gap-4 lg:gap-5">
          {/* Wallet summary via adminMoneyService().getMerchantWallet(id) */}
          <DataCard testId="admin-merchant-wallet" title="Merchant wallet" result={walletResult}>
            {(wallet) => (
              <div className="grid gap-3">
                <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-on-surface/60">Available balance</span>
                    <CreditCard aria-hidden="true" className="size-4 text-on-surface/50" />
                  </div>
                  <div
                    className={`mt-1 font-mono text-2xl font-bold ${
                      wallet.balancePaise < 0 ? 'text-error' : 'text-on-surface'
                    }`}
                  >
                    {formatPaise(wallet.balancePaise)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-2.5">
                    <span className="text-on-surface/60">On hold</span>
                    <div className="font-mono font-semibold text-on-surface mt-0.5">
                      {formatPaise(wallet.holdPaise)}
                    </div>
                  </div>

                  <div className="rounded-control border border-secondary/60 bg-tertiary/40 p-2.5">
                    <span className="text-on-surface/60">Last recharged</span>
                    <div className="font-medium text-on-surface mt-0.5">
                      {wallet.lastRechargeAt ? formatDate(wallet.lastRechargeAt) : 'Never'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DataCard>

          {/* Quick Links Card */}
          <DataCard testId="admin-merchant-quick-links" title="Related records" result={merchantResult}>
            {(merchant) => (
              <div className="grid gap-2">
                <Link
                  href={`/admin/shipments?merchantId=${merchant.id}`}
                  className="flex min-h-11 items-center justify-between rounded-control border border-secondary bg-surface p-3 text-sm transition-colors hover:border-primary/40 hover:bg-muted/50 lg:min-h-control"
                >
                  <div className="flex items-center gap-2.5">
                    <Package aria-hidden="true" className="size-4 text-primary" />
                    <span className="font-medium text-on-surface">Shipments</span>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="size-4 text-on-surface/50" />
                </Link>

                <Link
                  href={`/admin/support?merchant=${merchant.id}`}
                  className="flex min-h-11 items-center justify-between rounded-control border border-secondary bg-surface p-3 text-sm transition-colors hover:border-primary/40 hover:bg-muted/50 lg:min-h-control"
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket aria-hidden="true" className="size-4 text-primary" />
                    <span className="font-medium text-on-surface">Support tickets</span>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="size-4 text-on-surface/50" />
                </Link>

                <Link
                  href={`/admin/onboarding?status=all&q=${encodeURIComponent(merchant.id)}`}
                  className="flex min-h-11 items-center justify-between rounded-control border border-secondary bg-surface p-3 text-sm transition-colors hover:border-primary/40 hover:bg-muted/50 lg:min-h-control"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
                    <span className="font-medium text-on-surface">KYC & Onboarding</span>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="size-4 text-on-surface/50" />
                </Link>
              </div>
            )}
          </DataCard>
        </div>
      </div>
    </>
  );
}
