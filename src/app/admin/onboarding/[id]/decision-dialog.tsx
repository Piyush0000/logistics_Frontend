'use client';

import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Dialog, PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import type { ApplicationStatus } from '@/lib/admin/data/onboarding';
import { decideApplicationAction } from './actions';

type DecisionType = 'approved' | 'rejected';

export function ApplicationDecisionButtons({
  applicationId,
  businessName,
  currentStatus,
}: {
  applicationId: string;
  businessName: string;
  currentStatus: ApplicationStatus;
}) {
  const router = useRouter();
  const [activeDecision, setActiveDecision] = useState<DecisionType | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (currentStatus !== 'pending') {
    return null;
  }

  const handleOpen = (decision: DecisionType) => {
    setError(null);
    setReason('');
    setActiveDecision(decision);
  };

  const handleClose = () => {
    if (!isPending) {
      setActiveDecision(null);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDecision) return;

    if (activeDecision === 'rejected') {
      const trimmed = reason.trim();
      if (trimmed.length < 10 || trimmed.length > 500) {
        setError('Rejection reason must be between 10 and 500 characters.');
        return;
      }
    }

    startTransition(async () => {
      const res = await decideApplicationAction(
        applicationId,
        activeDecision,
        activeDecision === 'rejected' ? reason.trim() : undefined,
      );

      if (res.ok) {
        setActiveDecision(null);
        router.push(`/admin/onboarding?status=${res.targetStatus}`);
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => handleOpen('approved')}
        data-testid="admin-application-approve-button"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-success/15 px-4 text-sm font-semibold text-success transition-colors duration-150 hover:bg-success/25 lg:h-control"
      >
        <CheckCircle aria-hidden="true" className="size-4" />
        <span>Approve application</span>
      </button>

      <button
        type="button"
        onClick={() => handleOpen('rejected')}
        data-testid="admin-application-reject-button"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-error/15 px-4 text-sm font-semibold text-error transition-colors duration-150 hover:bg-error/25 lg:h-control"
      >
        <XCircle aria-hidden="true" className="size-4" />
        <span>Reject application</span>
      </button>

      {activeDecision ? (
        <Dialog
          title={activeDecision === 'approved' ? `Approve ${businessName}?` : `Reject ${businessName}?`}
          onClose={handleClose}
        >
          <form onSubmit={handleSubmit} className="grid gap-4">
            <p className="text-sm text-on-surface/80">
              {activeDecision === 'approved'
                ? 'This will approve the merchant KYC application and immediately activate their account to start shipping.'
                : 'Explain why this KYC application is being rejected. The merchant will see this reason in their dashboard.'}
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

            {activeDecision === 'rejected' ? (
              <div>
                <div className="flex items-center justify-between pb-1.5">
                  <label
                    htmlFor="rejection-reason"
                    className="text-xs font-semibold uppercase text-on-surface/70"
                  >
                    Reason <span className="text-error">*</span>
                  </label>
                  <span className="text-xs font-mono text-on-surface/50">
                    {reason.trim().length} / 500
                  </span>
                </div>
                <textarea
                  id="rejection-reason"
                  name="reason"
                  required
                  rows={4}
                  minLength={10}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why the application is rejected (10 to 500 characters)..."
                  className="w-full rounded-control border border-secondary bg-tertiary/60 p-3 text-sm text-on-surface placeholder:text-on-surface/40 focus:border-primary focus:outline-none"
                />
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isPending}
                onClick={handleClose}
                className={SECONDARY_BUTTON}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isPending ||
                  (activeDecision === 'rejected' &&
                    (reason.trim().length < 10 || reason.trim().length > 500))
                }
                className={
                  activeDecision === 'rejected'
                    ? 'inline-flex h-11 items-center justify-center rounded-control bg-error px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 lg:h-control'
                    : PRIMARY_BUTTON
                }
              >
                {isPending
                  ? 'Saving decision...'
                  : activeDecision === 'approved'
                  ? 'Confirm approval'
                  : 'Reject application'}
              </button>
            </div>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}

