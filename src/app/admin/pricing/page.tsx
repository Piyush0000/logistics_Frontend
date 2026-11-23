import type { Metadata } from 'next';
import { CarrierBadge } from '@/components/orders/carrier-badge';
import { DataCard } from '@/components/ui/data-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { tableStyles as t } from '@/components/ui/table-styles';
import { adminMerchantsService } from '@/lib/admin/data/merchants';
import { adminPricingService, type RateCardRow } from '@/lib/admin/data/pricing';
import { parseRateFilters, ZONE_MEANING, ZONES } from '@/lib/admin/data/pricing/pricing-rules';
import { requireAdminSession } from '@/lib/admin/session';
import { formatDate } from '@/lib/format/date';
import { formatPaise } from '@/lib/format/money';
import { AddOverrideButton, CourierSwitch, EditRateButton, RateFiltersForm, RemoveOverrideButton } from './pricing-dialogs';

export const metadata: Metadata = { title: 'Pricing & couriers' };

const CARRIER_NAMES: Record<string, string> = {
  delhivery: 'Delhivery',
  ekart: 'Ekart',
  bluedart: 'Blue Dart',
  shadowfax: 'Shadowfax',
  dhl: 'DHL',
};
const carrierName = (carrier: string) => CARRIER_NAMES[carrier] ?? carrier;
const codFee = (row: RateCardRow) => `${row.codPercent}% (min ${formatPaise(row.codMinimumPaise)})`;

// Owner: Teammate 2. See docs/admin/team-split.md.
export default async function AdminPricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const filters = parseRateFilters(await searchParams);
  const service = adminPricingService();
  const [couriers, rateCard, overrides, merchants] = await Promise.all([
    service.listCouriers(),
    service.listRateCard(),
    service.listOverrides(),
    adminMerchantsService().listMerchants({}),
  ]);
  const courierOptions = couriers.ok ? couriers.data.map(({ carrier, name }) => ({ carrier, name })) : [];
  const merchantOptions = merchants.ok ? merchants.data.items.map(({ id, name }) => ({ id, name })) : [];

  return (
    <>
      <PageHeader title="Pricing & couriers" description="Which couriers are on, and what merchants pay per zone." />

      <DataCard testId="admin-couriers" title="Couriers" result={couriers}>
        {(rows) => (
          <>
            <p className="mb-3 text-sm text-on-surface/70">
              {rows.filter((courier) => courier.enabled).length} of {rows.length} on. At least one courier must stay on.
            </p>
            <ul className="motion-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {rows.map((courier) => (
                <li key={courier.carrier} data-testid="admin-courier" data-carrier={courier.carrier} className="rounded-control border border-secondary p-3">
                  <span className="font-semibold">{courier.name}</span>
                  <p className="mt-1 text-xs text-on-surface/65">
                    Delivered <span className="font-mono text-on-surface">{courier.deliveryRate.toFixed(1)}%</span> in 90 days
                  </p>
                  <div className="mt-2">
                    <CourierSwitch courier={courier} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </DataCard>

      <DataCard testId="admin-rate-card" title="Rate card" result={rateCard}>
        {(all) => {
          const rows = all.filter((row) => (!filters.carrier || row.carrier === filters.carrier) && (!filters.zone || row.zone === filters.zone));
          const groups = [...new Set(rows.map((row) => row.carrier))];
          return (
            <>
              <RateFiltersForm key={`${filters.carrier}-${filters.zone}`} filters={filters} couriers={courierOptions} />
              {rows.length === 0 ? (
                <EmptyState message="No rate card rows match these filters." />
              ) : (
                <>
                  <div className={`${t.wrap} max-lg:hidden`}>
                    <table className={t.table}>
                      <thead>
                        <tr>
                          <th className={t.th}>Courier</th>
                          <th className={t.th}>Zone</th>
                          <th className={`${t.th} text-right`}>First 500 g</th>
                          <th className={`${t.th} text-right`}>Each extra 500 g</th>
                          <th className={`${t.th} text-right`}>COD fee</th>
                          <th className={t.th}>
                            <span className="sr-only">Actions</span>
                          </th>
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
                            <td className={t.tdNumeric}>{codFee(row)}</td>
                            <td className={`${t.td} text-right`}>
                              <EditRateButton row={row} carrierName={carrierName(row.carrier)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Phones: grouped by courier. */}
                  <div className="grid gap-5 lg:hidden">
                    {groups.map((carrier) => (
                      <section key={carrier} data-testid="admin-rate-group" aria-label={carrierName(carrier)}>
                        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <CarrierBadge carrier={carrier} />
                        </h3>
                        <ul className="grid gap-3">
                          {rows
                            .filter((row) => row.carrier === carrier)
                            .map((row) => (
                              <li key={row.zone} data-testid="admin-rate-card-item" className="rounded-control border border-secondary p-3">
                                <p className="font-semibold">
                                  Zone {row.zone} <span className="text-xs font-normal text-on-surface/60">{ZONE_MEANING[row.zone].name}</span>
                                </p>
                                <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <dt className="text-xs text-on-surface/60">First 500 g</dt>
                                    <dd className="font-mono">{formatPaise(row.basePaise)}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs text-on-surface/60">Each extra 500 g</dt>
                                    <dd className="font-mono">{formatPaise(row.extraPer500gPaise)}</dd>
                                  </div>
                                  <div className="col-span-2">
                                    <dt className="text-xs text-on-surface/60">COD fee</dt>
                                    <dd className="font-mono">{codFee(row)}</dd>
                                  </div>
                                </dl>
                                <div className="mt-3">
                                  <EditRateButton row={row} carrierName={carrierName(row.carrier)} wide />
                                </div>
                              </li>
                            ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </>
              )}
            </>
          );
        }}
      </DataCard>

      <section data-testid="admin-zones" aria-labelledby="zones-title" className="motion-rise rounded-card border border-secondary bg-surface p-card">
        <h2 id="zones-title" className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">
          What the zones mean
        </h2>
        <p className="mt-1 text-sm text-on-surface/70">
          The same rules as the order engine&apos;s resolveZone, which compares the pickup and delivery PIN codes.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {ZONES.map((zone) => (
            <div key={zone} className="rounded-control border border-secondary p-3">
              <dt className="font-semibold">
                <span className="font-mono">{zone}</span> · {ZONE_MEANING[zone].name}
              </dt>
              <dd className="mt-1 text-xs text-on-surface/70">{ZONE_MEANING[zone].rule}</dd>
              <dd className="mt-1 font-mono text-[11px] text-on-surface/55">backend: {ZONE_MEANING[zone].backend}</dd>
            </div>
          ))}
        </dl>
      </section>

      <DataCard
        testId="admin-overrides"
        title="Custom prices"
        result={overrides}
        actions={<AddOverrideButton merchants={merchantOptions} couriers={courierOptions} />}
      >
        {(rows) =>
          rows.length === 0 ? (
            <EmptyState message="No merchant has a custom price. Everyone pays the rate card." />
          ) : (
            <>
              <div className={`${t.wrap} max-lg:hidden`}>
                <table className={t.table}>
                  <thead>
                    <tr>
                      <th className={t.th}>Merchant</th>
                      <th className={t.th}>Courier</th>
                      <th className={`${t.th} text-right`}>Discount</th>
                      <th className={t.th}>Reason</th>
                      <th className={t.th}>Added</th>
                      <th className={t.th}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((entry) => (
                      <tr key={entry.id} data-testid="admin-override-row" className={t.rowHover}>
                        <td className={`${t.td} font-semibold`}>{entry.merchantName}</td>
                        <td className={t.td}>{entry.carrier === 'all' ? 'All couriers' : <CarrierBadge carrier={entry.carrier} />}</td>
                        <td className={t.tdNumeric}>{entry.discountPercent}% off</td>
                        <td className={`${t.td} max-w-xs text-xs [overflow-wrap:anywhere]`}>{entry.reason}</td>
                        <td className={`${t.td} text-xs text-on-surface/70`}>{formatDate(entry.createdAt)}</td>
                        <td className={`${t.td} text-right`}>
                          <RemoveOverrideButton override={entry} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="grid gap-3 lg:hidden">
                {rows.map((entry) => (
                  <li key={entry.id} data-testid="admin-override-card" className="rounded-control border border-secondary p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold [overflow-wrap:anywhere]">{entry.merchantName}</p>
                      <p className="shrink-0 font-mono font-semibold">{entry.discountPercent}% off</p>
                    </div>
                    <p className="mt-1 text-xs text-on-surface/70">
                      {entry.carrier === 'all' ? 'All couriers' : carrierName(entry.carrier)} · added {formatDate(entry.createdAt)}
                    </p>
                    <p className="mt-2 text-sm [overflow-wrap:anywhere]">{entry.reason}</p>
                    <div className="mt-3">
                      <RemoveOverrideButton override={entry} wide />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )
        }
      </DataCard>
    </>
  );
}
