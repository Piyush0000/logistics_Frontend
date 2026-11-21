'use client';

import { CheckCheck, Landmark, ListChecks, Upload } from 'lucide-react';
import { useActionState, useId, useState, type ReactNode } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { COD_CARRIERS } from '@/lib/admin/data/money/cod-rules';
import { cleanReason, REASON_MAX } from '@/lib/admin/data/money/wallet-adjustment';
import { formatPaise } from '@/lib/format/money';
import {
  reconcileRemittanceAction,
  recordCodPaymentAction,
  resolveExceptionAction,
  verifyBankAction,
  type CodActionState,
} from './actions';

const IDLE: CodActionState = { status: 'idle' };
const SIZE = 'max-lg:h-11';
const FIELD =
  'w-full rounded-control border border-secondary bg-surface px-3 text-sm transition-[border-color,box-shadow] duration-150 outline-none hover:border-on-surface/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 aria-invalid:border-error';
const CHOICE =
  'flex h-11 flex-1 cursor-pointer items-center justify-center rounded-control border text-sm font-medium transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-primary/30 lg:h-control';

type Action = (previous: CodActionState, form: FormData) => Promise<CodActionState>;

/** A button that opens a popup holding one action's form; after saving, the popup shows the result. */
function ActionDialog({
  label,
  ariaLabel,
  title,
  icon,
  primary = false,
  wide = false,
  available = true,
  action,
  children,
}: {
  /** False once the action no longer applies: the button goes, but an open popup stays to show its result. */
  available?: boolean;
  label: string;
  ariaLabel: string;
  title: string;
  icon: ReactNode;
  primary?: boolean;
  wide?: boolean;
  action: Action;
  children: (state: CodActionState, pending: boolean, close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {available ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className={`${primary ? PRIMARY_BUTTON : SECONDARY_BUTTON} ${SIZE} ${wide ? 'flex-1' : ''}`}
      >
        {icon}
        {label}
      </button>
      ) : null}
      {open ? (
        <Dialog title={title} onClose={() => setOpen(false)}>
          <ActionBody action={action} close={() => setOpen(false)}>
            {children}
          </ActionBody>
        </Dialog>
      ) : null}
    </>
  );
}

function ActionBody({
  action,
  close,
  children,
}: {
  action: Action;
  close: () => void;
  children: (state: CodActionState, pending: boolean, close: () => void) => ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  if (state.status === 'saved') {
    return (
      <div className="grid gap-4">
        <p role="status" data-testid="cod-saved" className="rounded-control bg-success/15 p-3 text-sm font-medium">
          {state.message}
        </p>
        <div className="flex justify-end">
          <button type="button" onClick={close} className={`${PRIMARY_BUTTON} ${SIZE} max-lg:flex-1`}>
            Done
          </button>
        </div>
      </div>
    );
  }
  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {children(state, pending, close)}
      {state.status === 'invalid' && state.message ? (
        <p role="alert" data-testid="cod-error" className="rounded-control border border-error/30 bg-error/10 p-3 text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function Buttons({ pending, close, submit }: { pending: boolean; close: () => void; submit: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button type="button" onClick={close} className={`${SECONDARY_BUTTON} ${SIZE} max-lg:flex-1`}>
        Cancel
      </button>
      <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} ${SIZE} max-lg:flex-1`}>
        {pending ? 'Saving…' : submit}
      </button>
    </div>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-2 rounded-control bg-tertiary p-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3">
          <dt className="text-on-surface/70">{label}</dt>
          <dd className="text-right font-mono [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="mt-1 text-sm text-error">
      {message}
    </p>
  ) : null;
}

const errorsOf = (state: CodActionState) => (state.status === 'invalid' ? state.errors : {});

function signed(paise: number) {
  if (paise === 0) return formatPaise(0);
  return `${paise < 0 ? '−' : '+'}${formatPaise(Math.abs(paise))}`;
}

export function ReconcileButton({
  remittance,
  available,
}: {
  available: boolean;
  remittance: { id: string; carrier: string; lineCount: number; expectedPaise: number; receivedPaise: number };
}) {
  const difference = remittance.receivedPaise - remittance.expectedPaise;
  return (
    <ActionDialog
      label="Reconcile"
      ariaLabel={`Reconcile ${remittance.id}`}
      title="Reconcile batch"
      icon={<ListChecks aria-hidden="true" className="size-4" />}
      primary
      available={available}
      action={reconcileRemittanceAction}
    >
      {(_state, pending, close) => (
        <>
          <input type="hidden" name="id" value={remittance.id} />
          <p className="text-sm text-on-surface/70">
            Matches each of the {remittance.lineCount} lines against its order and opens an exception for every line that
            differs. A batch is reconciled once; this cannot be run again.
          </p>
          <Facts
            rows={[
              ['Batch', remittance.id],
              ['Expected', formatPaise(remittance.expectedPaise)],
              ['Received', formatPaise(remittance.receivedPaise)],
              ['Difference', <span key="d" className={difference < 0 ? 'font-semibold text-error' : ''}>{signed(difference)}</span>],
            ]}
          />
          <Buttons pending={pending} close={close} submit="Reconcile" />
        </>
      )}
    </ActionDialog>
  );
}

export function VerifyBankButton({ remittance }: { remittance: { id: string; receivedPaise: number; utr: string | null } }) {
  const id = useId();
  return (
    <ActionDialog
      label="Verify bank"
      ariaLabel={`Verify bank credit for ${remittance.id}`}
      title="Verify bank credit"
      icon={<Landmark aria-hidden="true" className="size-4" />}
      action={verifyBankAction}
    >
      {(state, pending, close) => {
        const errors = errorsOf(state);
        return (
          <>
            <input type="hidden" name="id" value={remittance.id} />
            <p className="text-sm text-on-surface/70">
              Enter what the bank statement shows. It is compared with the courier&apos;s lines total.
            </p>
            <Facts rows={[['Lines total', formatPaise(remittance.receivedPaise)]]} />
            <div>
              <label htmlFor={`${id}-credit`} className={FIELD_LABEL}>
                Bank credit (₹)
              </label>
              <input
                id={`${id}-credit`}
                name="credit"
                inputMode="decimal"
                autoComplete="off"
                placeholder="For example 96100"
                aria-invalid={errors.credit ? true : undefined}
                aria-describedby={errors.credit ? `${id}-credit-error` : undefined}
                className={`${FIELD} h-11 font-mono lg:h-control`}
              />
              <FieldError id={`${id}-credit-error`} message={errors.credit} />
            </div>
            <div>
              <label htmlFor={`${id}-utr`} className={FIELD_LABEL}>
                UTR (optional)
              </label>
              <input
                id={`${id}-utr`}
                name="utr"
                autoComplete="off"
                placeholder={remittance.utr ?? 'From the bank statement'}
                aria-invalid={errors.utr ? true : undefined}
                aria-describedby={errors.utr ? `${id}-utr-error` : undefined}
                className={`${FIELD} h-11 font-mono uppercase lg:h-control`}
              />
              <FieldError id={`${id}-utr-error`} message={errors.utr} />
            </div>
            <Buttons pending={pending} close={close} submit="Save" />
          </>
        );
      }}
    </ActionDialog>
  );
}

export function ResolveExceptionButton({
  exception,
  wide = false,
}: {
  exception: { id: string; awb: string; batchId: string; variancePaise: number; status: string };
  wide?: boolean;
}) {
  const id = useId();
  const [resolution, setResolution] = useState<'resolved' | 'written_off'>('resolved');
  const [note, setNote] = useState('');
  const length = cleanReason(note).length;
  return (
    <ActionDialog
      label="Resolve"
      ariaLabel={`Resolve exception for ${exception.awb}`}
      title="Resolve exception"
      icon={<CheckCheck aria-hidden="true" className="size-4" />}
      wide={wide}
      available={exception.status === 'open'}
      action={resolveExceptionAction}
    >
      {(state, pending, close) => {
        const errors = errorsOf(state);
        return (
          <>
            <input type="hidden" name="id" value={exception.id} />
            <Facts
              rows={[
                ['AWB', exception.awb],
                ['Batch', exception.batchId],
                ['Difference', <span key="d" className={exception.variancePaise < 0 ? 'font-semibold text-error' : ''}>{signed(exception.variancePaise)}</span>],
              ]}
            />
            <fieldset>
              <legend className={FIELD_LABEL}>Outcome</legend>
              <div className="flex gap-2">
                {(
                  [
                    ['resolved', 'Resolved'],
                    ['written_off', 'Written off'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`${CHOICE} ${
                      resolution === value
                        ? 'border-primary bg-muted font-semibold text-primary'
                        : 'border-secondary bg-surface text-on-surface/70 hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution"
                      value={value}
                      checked={resolution === value}
                      onChange={() => setResolution(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
              <FieldError id={`${id}-resolution-error`} message={errors.resolution} />
            </fieldset>
            <div>
              <label htmlFor={`${id}-note`} className={FIELD_LABEL}>
                Reason
              </label>
              <textarea
                id={`${id}-note`}
                name="note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="For example: courier confirmed the customer paid less after a partial return"
                aria-invalid={errors.note ? true : undefined}
                aria-describedby={`${id}-note-count${errors.note ? ` ${id}-note-error` : ''}`}
                className={`${FIELD} py-2.5`}
              />
              <p id={`${id}-note-count`} className={`mt-1 text-xs ${length > REASON_MAX ? 'text-error' : 'text-on-surface/60'}`}>
                {length} of {REASON_MAX} characters. Saved in the audit log.
              </p>
              <FieldError id={`${id}-note-error`} message={errors.note} />
            </div>
            <Buttons pending={pending} close={close} submit="Save" />
          </>
        );
      }}
    </ActionDialog>
  );
}

/** Upload a courier's COD remittance file: marks each AWB's line paid, ready to reconcile. */
export function RecordPaymentButton() {
  const id = useId();
  return (
    <ActionDialog
      label="Record courier payment"
      ariaLabel="Record a courier COD payment"
      title="Record courier payment"
      icon={<Upload aria-hidden="true" className="size-4" />}
      primary
      action={recordCodPaymentAction}
    >
      {(state, pending, close) => {
        const errors = errorsOf(state);
        return (
          <>
            <p className="text-sm text-on-surface/70">
              Upload the courier&apos;s COD remittance file as CSV. It needs an AWB column and an amount column in
              rupees; the courier&apos;s own export usually works as is.
            </p>
            <div>
              <label htmlFor={`${id}-carrier`} className={FIELD_LABEL}>
                Courier
              </label>
              <select
                id={`${id}-carrier`}
                name="carrier"
                defaultValue=""
                aria-invalid={errors.carrier ? true : undefined}
                aria-describedby={errors.carrier ? `${id}-carrier-error` : undefined}
                className={`${FIELD} h-11 lg:h-control`}
              >
                <option value="" disabled>
                  Choose
                </option>
                {COD_CARRIERS.map((carrier) => (
                  <option key={carrier.value} value={carrier.value}>
                    {carrier.label}
                  </option>
                ))}
              </select>
              <FieldError id={`${id}-carrier-error`} message={errors.carrier} />
            </div>
            <div>
              <label htmlFor={`${id}-file`} className={FIELD_LABEL}>
                Remittance file (CSV)
              </label>
              <input
                id={`${id}-file`}
                name="file"
                type="file"
                accept=".csv,text/csv"
                aria-invalid={errors.file ? true : undefined}
                aria-describedby={errors.file ? `${id}-file-error` : undefined}
                className={`${FIELD} py-2`}
              />
              <FieldError id={`${id}-file-error`} message={errors.file} />
            </div>
            <div>
              <label htmlFor={`${id}-utr`} className={FIELD_LABEL}>
                UTR (optional)
              </label>
              <input
                id={`${id}-utr`}
                name="utr"
                autoComplete="off"
                placeholder="From the bank statement"
                aria-invalid={errors.utr ? true : undefined}
                aria-describedby={errors.utr ? `${id}-utr-error` : undefined}
                className={`${FIELD} h-11 font-mono uppercase lg:h-control`}
              />
              <FieldError id={`${id}-utr-error`} message={errors.utr} />
            </div>
            <Buttons pending={pending} close={close} submit="Record payment" />
          </>
        );
      }}
    </ActionDialog>
  );
}
