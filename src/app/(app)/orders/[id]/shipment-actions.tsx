'use client';

import { Ban, Download, LoaderCircle } from 'lucide-react';
import { useActionState, useState } from 'react';
import { cancelShipmentAction, type CancelState } from './actions';

/** Statuses the courier still lets us cancel: booked, before pickup. */
const CANCELLABLE = new Set(['CREATED', 'MANIFESTED', 'PICKUP_SCHEDULED']);

interface ShipmentActionsProps {
  id: string;
  status: string;
  labelAvailable: boolean;
  cancelRequested: boolean;
  cancelError: string | null;
}

const IDLE: CancelState = { status: 'idle' };

const secondaryButton =
  'inline-flex h-11 items-center gap-1.5 rounded-control border border-secondary bg-surface px-3 text-sm font-medium text-on-surface hover:bg-tertiary disabled:opacity-60 lg:h-control';

export function ShipmentActions({
  id,
  status,
  labelAvailable,
  cancelRequested,
  cancelError,
}: ShipmentActionsProps) {
  const [state, action, pending] = useActionState(cancelShipmentAction, IDLE);
  const [confirming, setConfirming] = useState(false);

  const waiting = cancelRequested || state.status === 'requested';
  const canCancel =
    CANCELLABLE.has(status) && !waiting && state.status !== 'cancelled' && status !== 'CANCELLED';

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {labelAvailable && status !== 'CANCELLED' ? (
          <a
            href={`/orders/${encodeURIComponent(id)}/label`}
            className="inline-flex h-11 items-center gap-1.5 rounded-control bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary/90 lg:h-control"
            data-testid="download-label"
          >
            <Download aria-hidden="true" className="size-4" />
            Download label
          </a>
        ) : null}

        {canCancel && !confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={secondaryButton}
            data-testid="cancel-shipment"
          >
            <Ban aria-hidden="true" className="size-4" />
            Cancel shipment
          </button>
        ) : null}
      </div>

      {canCancel && confirming ? (
        <form
          action={action}
          className="grid w-full max-w-sm gap-2 rounded-control border border-secondary bg-tertiary/60 p-3 text-sm"
        >
          <input type="hidden" name="id" value={id} />
          <p className="font-medium text-on-surface">Cancel this shipment with the courier?</p>
          <input
            name="reason"
            maxLength={200}
            placeholder="Reason (optional)"
            className="h-control min-h-[44px] w-full rounded-control border border-secondary bg-surface px-3 text-sm focus:border-primary focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
              Keep it
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 items-center gap-1.5 rounded-control border border-error/40 bg-error/10 px-3 text-sm font-medium text-error hover:bg-error/20 disabled:opacity-60 lg:h-control"
              data-testid="confirm-cancel"
            >
              {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
              Yes, cancel
            </button>
          </div>
        </form>
      ) : null}

      {waiting ? (
        <p role="status" className="text-xs text-on-surface/70">
          {state.message ?? 'Cancellation sent to the courier. It usually confirms within a few minutes.'}
        </p>
      ) : null}
      {state.status === 'cancelled' ? (
        <p role="status" className="text-xs text-on-surface/70">
          {state.message}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="text-xs text-error">
          {state.message}
        </p>
      ) : null}
      {!waiting && state.status === 'idle' && cancelError ? (
        <p role="alert" className="max-w-sm text-right text-xs text-error">
          The courier did not cancel: {cancelError}
        </p>
      ) : null}
    </div>
  );
}
