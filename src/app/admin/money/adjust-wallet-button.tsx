'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useActionState, useId, useState } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { cleanReason, REASON_MAX, type WalletDirection } from '@/lib/admin/data/money/wallet-adjustment';
import { formatPaise } from '@/lib/format/money';
import { adjustWalletAction, type AdjustWalletState } from './actions';

const IDLE: AdjustWalletState = { status: 'idle' };

const FIELD =
  'w-full rounded-control border border-secondary bg-surface px-3 text-sm transition-[border-color,box-shadow] duration-150 outline-none hover:border-on-surface/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 aria-invalid:border-error';

const CHOICE =
  'flex h-11 flex-1 cursor-pointer items-center justify-center rounded-control border text-sm font-medium transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-primary/30 lg:h-control';

const BUTTON_SIZE = 'max-lg:h-11';

interface WalletRef {
  merchantId: string;
  merchantName: string;
  balancePaise: number;
}

/** The Adjust button for one wallet, and its popup. */
export function AdjustWalletButton({ wallet, wide = false }: { wallet: WalletRef; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Adjust wallet of ${wallet.merchantName}`}
        className={`${SECONDARY_BUTTON} ${BUTTON_SIZE} ${wide ? 'flex-1' : ''}`}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Adjust
      </button>
      {open ? (
        <Dialog title="Adjust wallet" onClose={() => setOpen(false)}>
          <AdjustWalletForm wallet={wallet} onDone={() => setOpen(false)} />
        </Dialog>
      ) : null}
    </>
  );
}

function AdjustWalletForm({ wallet, onDone }: { wallet: WalletRef; onDone: () => void }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(adjustWalletAction, IDLE);
  const [direction, setDirection] = useState<WalletDirection>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  // Back from the confirm step hides that review until the next one arrives.
  const [dismissed, setDismissed] = useState<AdjustWalletState | null>(null);

  if (state.status === 'saved') {
    return (
      <div className="grid gap-4">
        <p role="status" data-testid="adjust-saved" className="rounded-control bg-success/15 p-3 text-sm font-medium">
          {state.message}
        </p>
        <div className="flex justify-end">
          <button type="button" onClick={onDone} className={`${PRIMARY_BUTTON} ${BUTTON_SIZE} max-lg:flex-1`}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const hidden = (step: 'review' | 'confirm') => (
    <>
      <input type="hidden" name="merchantId" value={wallet.merchantId} />
      <input type="hidden" name="step" value={step} />
    </>
  );

  if (state.status === 'review' && state !== dismissed) {
    const below = state.newPaise < 0;
    return (
      <form action={formAction} className="grid gap-4" aria-label="Confirm the adjustment">
        {hidden('confirm')}
        <input type="hidden" name="amount" value={(state.amountPaise / 100).toFixed(2)} />
        <input type="hidden" name="direction" value={state.direction} />
        <input type="hidden" name="reason" value={state.reason} />

        <p className="text-sm text-on-surface/70">Check the change for {wallet.merchantName} before saving.</p>
        <dl data-testid="adjust-review" className="grid gap-2 rounded-control bg-tertiary p-3 text-sm">
          <Row label="Current balance" value={formatPaise(state.currentPaise)} />
          <Row
            label={state.direction === 'credit' ? 'Credit' : 'Debit'}
            value={`${state.direction === 'credit' ? '+' : '−'}${formatPaise(state.amountPaise)}`}
          />
          <div className="flex items-baseline justify-between gap-3 border-t border-secondary pt-2">
            <dt className="font-semibold">New balance</dt>
            <dd data-testid="adjust-new-balance" className={`font-mono text-base font-semibold ${below ? 'text-error' : ''}`}>
              {formatPaise(state.newPaise)}
            </dd>
          </div>
          <div className="grid gap-0.5 border-t border-secondary pt-2">
            <dt className="text-on-surface/70">Reason</dt>
            <dd className="[overflow-wrap:anywhere]">{state.reason}</dd>
          </div>
        </dl>
        {below ? (
          <p className="rounded-control border border-warning/30 bg-warning/10 p-3 text-sm">
            This leaves the wallet below zero. The merchant cannot book until they recharge.
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setDismissed(state)}
            disabled={pending}
            className={`${SECONDARY_BUTTON} ${BUTTON_SIZE} max-lg:flex-1`}
          >
            Back
          </button>
          <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} ${BUTTON_SIZE} max-lg:flex-1`}>
            {pending ? 'Saving…' : `Confirm ${state.direction}`}
          </button>
        </div>
      </form>
    );
  }

  const errors = state.status === 'invalid' ? state.errors : {};
  const message = state.status === 'invalid' ? state.message : null;
  const reasonLength = cleanReason(reason).length;

  return (
    <form action={formAction} className="grid gap-4" aria-label="Adjust the wallet" noValidate>
      {hidden('review')}
      <div className="rounded-control bg-tertiary p-3 text-sm">
        <p className="font-semibold [overflow-wrap:anywhere]">{wallet.merchantName}</p>
        <p className="text-on-surface/70">
          Current balance <span className="font-mono">{formatPaise(wallet.balancePaise)}</span>
        </p>
      </div>

      <fieldset>
        <legend className={FIELD_LABEL}>Direction</legend>
        <div className="flex gap-2">
          {(['credit', 'debit'] as const).map((value) => (
            <label
              key={value}
              className={`${CHOICE} ${
                direction === value
                  ? 'border-primary bg-muted font-semibold text-primary'
                  : 'border-secondary bg-surface text-on-surface/70 hover:bg-muted'
              }`}
            >
              <input
                type="radio"
                name="direction"
                value={value}
                checked={direction === value}
                onChange={() => setDirection(value)}
                className="sr-only"
              />
              {value === 'credit' ? 'Credit (add money)' : 'Debit (take money)'}
            </label>
          ))}
        </div>
        <FieldError id={`${id}-direction`} message={errors.direction} />
      </fieldset>

      <div>
        <label htmlFor={`${id}-amount`} className={FIELD_LABEL}>
          Amount (₹)
        </label>
        <input
          id={`${id}-amount`}
          name="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="For example 1250.50"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? `${id}-amount-error` : undefined}
          className={`${FIELD} h-11 font-mono lg:h-control`}
        />
        <FieldError id={`${id}-amount-error`} message={errors.amount} />
      </div>

      <div>
        <label htmlFor={`${id}-reason`} className={FIELD_LABEL}>
          Reason
        </label>
        <textarea
          id={`${id}-reason`}
          name="reason"
          rows={3}
          placeholder="For example: goodwill credit for a parcel lost in transit"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          aria-invalid={errors.reason ? true : undefined}
          aria-describedby={`${id}-reason-count${errors.reason ? ` ${id}-reason-error` : ''}`}
          className={`${FIELD} py-2.5`}
        />
        <p id={`${id}-reason-count`} className={`mt-1 text-xs ${reasonLength > REASON_MAX ? 'text-error' : 'text-on-surface/60'}`}>
          {reasonLength} of {REASON_MAX} characters. Saved in the audit log.
        </p>
        <FieldError id={`${id}-reason-error`} message={errors.reason} />
      </div>

      {message ? (
        <p role="alert" data-testid="adjust-error" className="rounded-control border border-error/30 bg-error/10 p-3 text-sm">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onDone} className={`${SECONDARY_BUTTON} ${BUTTON_SIZE} max-lg:flex-1`}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={`${PRIMARY_BUTTON} ${BUTTON_SIZE} max-lg:flex-1`}>
          {pending ? 'Checking…' : 'Review'}
        </button>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-on-surface/70">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} role="alert" className="mt-1 text-sm text-error">
      {message}
    </p>
  ) : null;
}
