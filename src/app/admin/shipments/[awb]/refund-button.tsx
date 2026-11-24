'use client';

import { RotateCcw } from 'lucide-react';
import { useActionState } from 'react';
import { SECONDARY_BUTTON } from '@/components/ui/dialog';
import { refundCancelledAction, type RefundState } from './actions';

const IDLE: RefundState = { status: 'idle' };

/**
 * For a cancelled shipment: gives the merchant back what it held or was charged. Refunds are
 * automatic now; this repairs cancellations from before, and is safe to press twice.
 */
export function RefundCancelledButton({ awb }: { awb: string }) {
  const [state, action, pending] = useActionState(refundCancelledAction, IDLE);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="awb" value={awb} />
      {state.status === 'idle' ? (
        <button type="submit" disabled={pending} className={`${SECONDARY_BUTTON} max-lg:h-11`}>
          <RotateCcw aria-hidden="true" className="size-4" />
          {pending ? 'Checking…' : 'Give back the charge'}
        </button>
      ) : (
        <p
          role="status"
          className={`rounded-control p-2 text-sm ${state.status === 'done' ? 'bg-success/15' : 'bg-error/10'}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
