'use client';

import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import type { MerchantStatus } from '@/lib/admin/data/merchants';
import { updateMerchantStatusAction } from './actions';

export function MerchantStatusButton({
  merchantId,
  merchantName,
  currentStatus,
}: {
  merchantId: string;
  merchantName: string;
  currentStatus: MerchantStatus;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSuspended = currentStatus === 'suspended';
  const targetStatus: MerchantStatus = isSuspended ? 'active' : 'suspended';
  const buttonLabel = isSuspended ? 'Reactivate merchant' : 'Suspend merchant';
  const dialogTitle = isSuspended ? `Reactivate ${merchantName}` : `Suspend ${merchantName}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = reason.trim();
    if (trimmed.length < 5 || trimmed.length > 300) {
      setError('Reason must be between 5 and 300 characters.');
      return;
    }

    startTransition(async () => {
      const result = await updateMerchantStatusAction(merchantId, targetStatus, trimmed);
      if (result.ok) {
        setOpen(false);
        setReason('');
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setReason('');
          setOpen(true);
        }}
        data-testid="admin-merchant-status-button"
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold transition-colors duration-150 lg:h-control ${
          isSuspended
            ? 'bg-success/15 text-success hover:bg-success/25'
            : 'bg-error/15 text-error hover:bg-error/25'
        }`}
      >
        {isSuspended ? (
          <CheckCircle aria-hidden="true" className="size-4" />
        ) : (
          <ShieldAlert aria-hidden="true" className="size-4" />
        )}
        <span>{buttonLabel}</span>
      </button>

      {open ? (
        <Dialog title={dialogTitle} onClose={() => !isPending && setOpen(false)}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <p className="text-sm text-on-surface/80">
              {isSuspended
                ? 'Reactivating this merchant will restore access to bookings and shipping services.'
                : 'Suspending this merchant will temporarily block label creation and wallet recharges.'}
            </p>

            {error ? (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-control border border-error/30 bg-error/10 p-3 text-xs text-error"
              >
                <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div>
              <div className="flex items-center justify-between pb-1.5">
                <label htmlFor="status-reason" className="text-xs font-semibold uppercase text-on-surface/70">
                  Reason <span className="text-error">*</span>
                </label>
                <span className="text-xs font-mono text-on-surface/50">
                  {reason.trim().length} / 300
                </span>
              </div>
              <textarea
                id="status-reason"
                required
                rows={3}
                minLength={5}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this action is being taken (5 to 300 characters)..."
                className="w-full rounded-control border border-secondary bg-tertiary/60 p-3 text-sm text-on-surface placeholder:text-on-surface/40 focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
                className={SECONDARY_BUTTON}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || reason.trim().length < 5 || reason.trim().length > 300}
                className={PRIMARY_BUTTON}
              >
                {isPending ? 'Updating...' : `Confirm ${isSuspended ? 'Reactivation' : 'Suspension'}`}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </>
  );
}

