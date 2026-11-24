'use client';

import { Download, Upload } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { MAX_BULK_FILE_BYTES, type BulkRow } from '@/lib/bulk-shipments';
import { previewBulkAction, submitBulkAction } from './actions';
import { RowPreview, RowResults, type LineOutcome } from './row-results';

const TEMPLATE_HREF = '/samples/bulk-shipments-template.csv';
const NETWORK_MESSAGE = 'Could not reach the server. Please try again.';

type Phase =
  | { kind: 'choose' }
  | { kind: 'preview'; rows: BulkRow[] }
  | { kind: 'booking'; rows: BulkRow[]; done: number; total: number }
  | { kind: 'done'; outcomes: LineOutcome[] };

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function UploadForm() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'choose' });
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  function reset() {
    setPhase({ kind: 'choose' });
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPhase({ kind: 'choose' });
    setError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a .csv file.');
      return;
    }
    if (file.size > MAX_BULK_FILE_BYTES) {
      setError('The file is larger than 1 MB.');
      return;
    }
    setReading(true);
    try {
      const result = await previewBulkAction(await file.text());
      if (!result.ok) setError(result.message);
      else if (result.fatal) setError(result.fatal);
      else if (result.rows.length === 0) setError('The file has no shipment rows.');
      else setPhase({ kind: 'preview', rows: result.rows });
    } catch {
      setError('Could not read the file. Please try again.');
    } finally {
      setReading(false);
    }
  }

  async function submit(rows: BulkRow[]) {
    const valid = rows.filter((row) => row.input !== null);
    const booked = new Map<number, LineOutcome>();
    setError(null);
    setPhase({ kind: 'booking', rows, done: 0, total: valid.length });
    // One row per request, in file order, so the progress is real and a failure stops nothing.
    for (const [index, row] of valid.entries()) {
      let outcome: LineOutcome;
      try {
        const result = await submitBulkAction([{ line: row.line, input: row.input }]);
        const first = result.ok ? result.results[0] : undefined;
        outcome = first
          ? { line: first.line, ok: first.ok, message: first.message }
          : { line: row.line, ok: false, message: result.ok ? NETWORK_MESSAGE : result.message };
      } catch {
        outcome = { line: row.line, ok: false, message: NETWORK_MESSAGE };
      }
      booked.set(row.line, outcome);
      setPhase({ kind: 'booking', rows, done: index + 1, total: valid.length });
    }
    setPhase({
      kind: 'done',
      outcomes: rows.map(
        (row) =>
          booked.get(row.line) ?? { line: row.line, ok: false, message: row.errors.join('; ') },
      ),
    });
  }

  const rows = phase.kind === 'preview' || phase.kind === 'booking' ? phase.rows : null;
  const validCount = rows ? rows.filter((row) => row.input !== null).length : 0;

  return (
    <div className="grid gap-6">
      <section className="motion-rise grid gap-4 rounded-card border border-secondary bg-surface p-card">
        <div>
          <h2 className="font-heading text-xl leading-7 lg:text-2xl lg:leading-8">Upload a file</h2>
          <p className="mt-1 text-sm text-on-surface/70">
            The template has only the column names: add one row per shipment, up to 200 rows and 1 MB.
            Every valid row books a real courier pickup, so use real addresses. Sending the same file
            twice never books a shipment twice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a href={TEMPLATE_HREF} download className={SECONDARY_BUTTON}>
            <Download aria-hidden="true" className="size-4" />
            Download template
          </a>
        </div>
        {phase.kind === 'done' ? (
          <div>
            <button type="button" onClick={reset} className={PRIMARY_BUTTON}>
              <Upload aria-hidden="true" className="size-4" />
              Upload another file
            </button>
          </div>
        ) : (
          <div className="max-w-xl">
            <label htmlFor={inputId} className={FIELD_LABEL}>
              Shipment file
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept=".csv,text/csv"
              disabled={reading || phase.kind === 'booking'}
              onChange={onFile}
              className="block h-control w-full rounded-control border border-secondary bg-surface text-sm file:mr-3 file:h-full file:border-0 file:bg-muted file:px-4 file:text-sm file:font-medium file:text-primary disabled:text-on-surface/60"
            />
          </div>
        )}
        {reading ? (
          <p role="status" className="text-sm text-on-surface/70">
            Reading the file...
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            data-testid="bulk-error"
            className="rounded-control bg-error/10 p-3 text-sm [overflow-wrap:anywhere]"
          >
            {error}
          </p>
        ) : null}
      </section>

      {rows ? (
        <section data-testid="bulk-preview" className="motion-rise grid gap-4 rounded-card border border-secondary bg-surface p-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-heading text-xl leading-7 lg:text-2xl lg:leading-8">Preview</h2>
              <p className="mt-1 text-sm text-on-surface/70">
                {validCount} valid, {rows.length - validCount} invalid
              </p>
            </div>
            <button
              type="button"
              disabled={validCount === 0 || phase.kind === 'booking'}
              onClick={() => submit(rows)}
              className={PRIMARY_BUTTON}
            >
              Submit {plural(validCount, 'valid row')}
            </button>
          </div>
          {phase.kind === 'booking' ? (
            <div role="status" className="grid gap-2">
              <p className="text-sm">
                Booking {phase.done} of {phase.total}
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${phase.total ? (phase.done / phase.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ) : null}
          <RowPreview rows={rows} />
        </section>
      ) : null}

      {phase.kind === 'done' ? (
        <section data-testid="bulk-results" className="motion-rise grid gap-4 rounded-card border border-secondary bg-surface p-card">
          <div>
            <h2 className="font-heading text-xl leading-7 lg:text-2xl lg:leading-8">Results</h2>
            <p role="status" className="mt-1 text-sm text-on-surface/70">
              {phase.outcomes.filter((o) => o.ok).length} booked,{' '}
              {phase.outcomes.filter((o) => !o.ok).length} not booked
            </p>
          </div>
          <RowResults outcomes={phase.outcomes} />
        </section>
      ) : null}
    </div>
  );
}
