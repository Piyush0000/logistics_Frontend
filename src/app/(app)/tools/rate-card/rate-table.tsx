import { CarrierBadge, carrierLabel } from '@/components/orders/carrier-badge';
import { ZONES, ZONE_LABELS, type RateCardRow } from '@/lib/data/rates';
import { tableStyles as t } from '@/components/ui/table-styles';
import { formatPaise } from '@/lib/format/money';

const kg = (value: number) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 3 })} kg`;
const percent = (value: number) => `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`;

function codFee(row: RateCardRow) {
  return `${percent(row.codFeePercent)} of the order, minimum ${formatPaise(row.minCodFeePaise)}`;
}

function zoneIndex(row: RateCardRow) {
  return ZONES.indexOf(row.zone);
}

/** Rates as a table on desktop, with zones in order and each zone's carriers together, and as one card per carrier on phones. */
export function RateTable({ rows }: { rows: RateCardRow[] }) {
  const byZone = [...rows].sort((a, b) => zoneIndex(a) - zoneIndex(b));
  const carriers = [...new Set(rows.map((row) => row.carrier))];

  return (
    <>
      <div className={`${t.wrap} hidden lg:block`}>
        <table aria-label="Rate card" className={t.table}>
          <thead>
            <tr>
              <th scope="col" className={t.th}>Zone</th>
              <th scope="col" className={t.th}>Courier</th>
              <th scope="col" className={`${t.th} text-right`}>Base price</th>
              <th scope="col" className={`${t.th} text-right`}>Each extra 500 g</th>
              <th scope="col" className={t.th}>COD fee</th>
            </tr>
          </thead>
          <tbody>
            {byZone.map((row) => (
              <tr key={`${row.zone}-${row.carrier}`} data-testid="rate-row" className={t.rowHover}>
                <td className={t.td}>
                  <span className="font-medium">Zone {row.zone}</span>
                  <span className="block text-xs text-on-surface/60">{ZONE_LABELS[row.zone].name}</span>
                </td>
                <td className={t.td}>
                  <CarrierBadge carrier={row.carrier} />
                </td>
                <td className={`${t.tdNumeric} whitespace-nowrap`}>
                  <span className="font-medium">{formatPaise(row.basePaise)}</span>
                  <span className="block font-body text-xs text-on-surface/60">first {kg(row.baseWeightKg)}</span>
                </td>
                <td className={`${t.tdNumeric} font-medium whitespace-nowrap`}>
                  {formatPaise(row.additionalPer500gPaise)}
                </td>
                <td className={t.td}>{codFee(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="motion-stagger grid gap-3 lg:hidden">
        {carriers.map((carrier) => (
          <article
            key={carrier}
            data-testid="rate-item"
            aria-label={carrierLabel(carrier)}
            className="grid min-w-0 gap-3 rounded-card border border-secondary bg-surface p-card"
          >
            <div>
              <CarrierBadge carrier={carrier} />
            </div>
            <ul className="grid divide-y divide-secondary">
              {rows
                .filter((row) => row.carrier === carrier)
                .sort((a, b) => zoneIndex(a) - zoneIndex(b))
                .map((row) => (
                  <li key={row.zone} data-testid="rate-line" className="grid gap-1 py-3 first:pt-0 last:pb-0">
                    <p className="text-sm font-semibold">
                      Zone {row.zone}
                      <span className="font-normal text-on-surface/60"> · {ZONE_LABELS[row.zone].name}</span>
                    </p>
                    <dl className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-x-3 gap-y-1 text-sm">
                      <div className="min-w-0">
                        <dt className="text-xs text-on-surface/60">First {kg(row.baseWeightKg)}</dt>
                        <dd className="font-mono font-medium tabular-nums">{formatPaise(row.basePaise)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs text-on-surface/60">Each extra 500 g</dt>
                        <dd className="font-mono font-medium tabular-nums">{formatPaise(row.additionalPer500gPaise)}</dd>
                      </div>
                      <div className="min-w-0 [overflow-wrap:anywhere]">
                        <dt className="text-xs text-on-surface/60">COD fee</dt>
                        <dd>{codFee(row)}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
