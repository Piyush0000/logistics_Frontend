'use client';

import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import type { MerchantStatus } from '@/lib/admin/data/merchants';
import { updateMerchantStatusAction } from './actions';

type TargetAction = 'activate' | 'suspend';

export function MerchantStatusButton({
  merchantId,
  merchantName,
  currentStatus,
}: {
  merchantId: string;
  merchantName: string;
  currentStatus: MerchantStatus;
}) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<TargetAction | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSuspended = currentStatus === 'suspended';
  const isPendingStatus = currentStatus === 'pending';

  const targetStatus: MerchantStatus = activeAction === 'suspend' ? 'suspended' : 'active';

  const dialogTitle =
    activeAction === 'suspend'
      ? `Suspend ${merchantName}`
      : isSuspended
      ? `Reactivate ${merchantName}`
      : `Activate ${merchantName}`;

  const dialogDescription =
    activeAction === 'suspend'
      ? 'Suspending this merchant will immediately freeze shipping label generation and wallet operations.'
      : isSuspended
      ? 'Reactivating this merchant will restore their ability to book shipments and recharge their wallet.'
      : 'Activating this merchant will approve their account for full platform shipping operations.';

  const confirmButtonText =
    activeAction === 'suspend'
      ? 'Confirm Suspension'
      : isSuspended
      ? 'Confirm Reactivation'
      : 'Confirm Activation';

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
        setActiveAction(null);
        setReason('');
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  const openDialog = (action: TargetAction) => {
    setError(null);
    setReason('');
    setActiveAction(action);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Activate button: shown for pending or suspended merchants */}
      {isPendingStatus ? (
        <button
          type="button"
          onClick={() => openDialog('activate')}
          data-testid="admin-merchant-activate-button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-success/15 px-4 text-sm font-semibold text-success transition-colors duration-150 hover:bg-success/25 lg:h-control"
        >
          <CheckCircle aria-hidden="true" className="size-4" />
          <span>Activate merchant</span>
        </button>
      ) : null}

      {isSuspended ? (
        <button
          type="button"
          onClick={() => openDialog('activate')}
          data-testid="admin-merchant-status-button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-success/15 px-4 text-sm font-semibold text-success transition-colors duration-150 hover:bg-success/25 lg:h-control"
        >
          <CheckCircle aria-hidden="true" className="size-4" />
          <span>Reactivate merchant</span>
        </button>
      ) : null}

      {/* Suspend button: shown for active or pending merchants */}
      {!isSuspended ? (
        <button
          type="button"
          onClick={() => openDialog('suspend')}
          data-testid="admin-merchant-status-button"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-error/15 px-4 text-sm font-semibold text-error transition-colors duration-150 hover:bg-error/25 lg:h-control"
        >
          <ShieldAlert aria-hidden="true" className="size-4" />
          <span>Suspend merchant</span>
        </button>
      ) : null}

      {activeAction ? (
        <Dialog title={dialogTitle} onClose={() => !isPending && setActiveAction(null)}>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <p className="text-sm text-on-surface/80">{dialogDescription}</p>

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
                onClick={() => setActiveAction(null)}
                className={SECONDARY_BUTTON}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || reason.trim().length < 5 || reason.trim().length > 300}
                className={PRIMARY_BUTTON}
              >
                {isPending ? 'Updating...' : confirmButtonText}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}
