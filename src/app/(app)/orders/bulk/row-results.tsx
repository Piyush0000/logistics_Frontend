import type { BulkRow } from '@/lib/bulk-shipments';
import { formatPaise } from '@/lib/format/money';

const BADGE = 'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium';
const GOOD = `${BADGE} border-success/40 bg-success/15 text-success`;
const BAD = `${BADGE} border-error/40 bg-error/10 text-error`;
const WRAP = '[overflow-wrap:anywhere]';

function Problems({ errors }: { errors: string[] }) {
  return (
    <ul className="grid gap-1 text-sm text-error">
      {errors.map((error) => (
        <li key={error} className={WRAP}>
          {error}
        </li>
      ))}
    </ul>
  );
}

function consignee(row: BulkRow): string {
  return row.input ? row.input.destination.name : '';
}

function destination(row: BulkRow): string {
  return row.input ? `${row.input.destination.city}, ${row.input.destination.pincode}` : '';
}

function payment(row: BulkRow): string {
  if (!row.input) return '';
  return row.input.payment_type === 'COD'
    ? `COD ${formatPaise(Math.round((row.input.cod_amount ?? 0) * 100))}`
    : 'Prepaid';
}

/** The file's rows before booking: valid ones with their key facts, invalid ones with each error. */
export function RowPreview({ rows }: { rows: BulkRow[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-secondary text-xs font-semibold tracking-wide text-on-surface/60 uppercase">
            <tr>
              <th scope="col" className="w-16 py-3 pr-3 font-medium">Line</th>
              <th scope="col" className="w-24 py-3 pr-3 font-medium">Status</th>
              <th scope="col" className="w-1/4 py-3 pr-3 font-medium">Consignee</th>
              <th scope="col" className="w-1/5 py-3 pr-3 font-medium">Destination</th>
              <th scope="col" className="w-32 py-3 pr-3 font-medium">Payment</th>
              <th scope="col" className="py-3 font-medium">Problems</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.line} data-testid="bulk-row" className="border-b border-secondary/50 align-top transition-colors duration-150 hover:bg-muted/50">
                <td className="py-3 pr-3 font-mono">{row.line}</td>
                <td className="py-3 pr-3">
                  <span className={row.input ? GOOD : BAD}>{row.input ? 'Valid' : 'Invalid'}</span>
                </td>
                <td className={`py-3 pr-3 ${WRAP}`}>{consignee(row)}</td>
                <td className={`py-3 pr-3 ${WRAP}`}>{destination(row)}</td>
                <td className="py-3 pr-3">{payment(row)}</td>
                <td className="py-3">{row.errors.length > 0 ? <Problems errors={row.errors} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="motion-stagger grid gap-3 lg:hidden">
        {rows.map((row) => (
          <article
            key={row.line}
            data-testid="bulk-item"
            className="grid gap-2 rounded-card border border-secondary bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-bold">Line {row.line}</p>
              <span className={row.input ? GOOD : BAD}>{row.input ? 'Valid' : 'Invalid'}</span>
            </div>
            {row.input ? (
              <p className={`text-sm ${WRAP}`}>
                {consignee(row)}, {destination(row)}
                <span className="block text-xs text-on-surface/60">{payment(row)}</span>
              </p>
            ) : null}
            {row.errors.length > 0 ? <Problems errors={row.errors} /> : null}
          </article>
        ))}
      </div>
    </>
  );
}

export interface LineOutcome {
  line: number;
  ok: boolean;
  message: string;
}

/** The outcome of each line after booking: booked with its AWB, or not booked with the reason. */
export function RowResults({ outcomes }: { outcomes: LineOutcome[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-secondary text-xs font-semibold tracking-wide text-on-surface/60 uppercase">
            <tr>
              <th scope="col" className="w-16 py-3 pr-3 font-medium">Line</th>
              <th scope="col" className="w-28 py-3 pr-3 font-medium">Result</th>
              <th scope="col" className="py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {outcomes.map((outcome) => (
              <tr key={outcome.line} data-testid="bulk-result" className="border-b border-secondary/50 align-top transition-colors duration-150 hover:bg-muted/50">
                <td className="py-3 pr-3 font-mono">{outcome.line}</td>
                <td className="py-3 pr-3">
                  <span className={outcome.ok ? GOOD : BAD}>{outcome.ok ? 'Booked' : 'Not booked'}</span>
                </td>
                <td className={`py-3 ${WRAP} ${outcome.ok ? '' : 'text-error'}`}>{outcome.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="motion-stagger grid gap-3 lg:hidden">
        {outcomes.map((outcome) => (
          <article
            key={outcome.line}
            data-testid="bulk-result-item"
            className="grid gap-2 rounded-card border border-secondary bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm font-bold">Line {outcome.line}</p>
              <span className={outcome.ok ? GOOD : BAD}>{outcome.ok ? 'Booked' : 'Not booked'}</span>
            </div>
            <p className={`text-sm ${WRAP} ${outcome.ok ? '' : 'text-error'}`}>{outcome.message}</p>
          </article>
        ))}
      </div>
    </>
  );
}
