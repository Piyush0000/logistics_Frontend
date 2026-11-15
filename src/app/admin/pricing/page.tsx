import type { Metadata } from 'next';
import { PlannedWork } from '@/components/admin/planned-work';
import { StatusChip } from '@/components/admin/status-chip';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { DataCard } from '@/components/ui/data-card';
import { PageHeader } from '@/components/ui/page-header';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminPricingService } from '@/lib/admin/data/pricing';
import { requireAdminSession } from '@/lib/admin/session';
import { formatPaise } from '@/lib/format/money';

export const metadata: Metadata = { title: 'Pricing & couriers' };

// Owner: Teammate 2. See docs/admin/team-split.md.
export default async function AdminPricingPage() {
  await requireAdminSession();
  const service = adminPricingService();
  const [couriers, rateCard] = await Promise.all([service.listCouriers(), service.listRateCard()]);

  return (
    <>
      <PageHeader title="Pricing & couriers" description="Which couriers are on, and what merchants pay per zone." />

      <DataCard testId="admin-couriers" title="Couriers" result={couriers}>
        {(rows) => (
          <ul className="motion-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {rows.map((courier) => (
              <li key={courier.carrier} data-testid="admin-courier" className="rounded-control border border-secondary p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{courier.name}</span>
                  <StatusChip tone={courier.enabled ? 'success' : 'neutral'}>{courier.enabled ? 'On' : 'Off'}</StatusChip>
                </div>
                <p className="mt-2 text-xs text-on-surface/65">
                  Delivered <span className="font-mono text-on-surface">{courier.deliveryRate.toFixed(1)}%</span> in 30 days
                </p>
              </li>
            ))}
          </ul>
        )}
      </DataCard>

      <DataCard testId="admin-rate-card" title="Rate card" result={rateCard}>
        {(rows) => (
          <div className={t.wrap}>
            <table className={t.table}>
              <thead>
                <tr>
                  <th className={t.th}>Courier</th>
                  <th className={t.th}>Zone</th>
                  <th className={`${t.th} text-right`}>First 500 g</th>
                  <th className={`${t.th} text-right`}>Each extra 500 g</th>
                  <th className={`${t.th} text-right`}>COD fee</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.carrier}-${row.zone}`} data-testid="admin-rate-row" className={t.rowHover}>
                    <td className={t.td}>
                      <CarrierBadge carrier={row.carrier} />
                    </td>
                    <td className={`${t.td} font-mono`}>{row.zone}</td>
                    <td className={t.tdNumeric}>{formatPaise(row.basePaise)}</td>
                    <td className={t.tdNumeric}>{formatPaise(row.extraPer500gPaise)}</td>
                    <td className={t.tdNumeric}>
                      {row.codPercent}% (min {formatPaise(row.codMinimumPaise, { decimals: 0 })})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>

      <PlannedWork
        items={[
          'Turn a courier on or off with confirmation (add setCourierEnabled; reuse the SwitchTrack pattern from merchant settings).',
          'Edit a rate card row in a Dialog with validation (whole rupees and paise, COD percent 0 to 10).',
          'Filter the rate card by courier and zone; group rows by courier on phones.',
          'Per-merchant price overrides (a merchant on a custom plan).',
          'Zone reference: what A to E mean, matching order-engine resolveZone.',
        ]}
      />
    </>
  );
}
