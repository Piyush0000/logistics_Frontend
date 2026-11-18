'use client';

import { RefreshCw, RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useTransition } from 'react';
import { SECONDARY_BUTTON } from '@/components/ui/dialog';
import { retryWebhookAction, type RetryState } from './actions';

const SIZE = 'max-lg:h-11';

/** Checks every service again by reloading the page's data. */
export function RefreshHealthButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className={`${SECONDARY_BUTTON} ${SIZE}`}
    >
      <RefreshCw aria-hidden="true" className={`size-4 ${pending ? 'opacity-50' : ''}`} />
      {pending ? 'Checking…' : 'Refresh'}
    </button>
  );
}

const IDLE: RetryState = { status: 'idle' };

/** Sends a failed delivery again. Stays mounted after the row changes, so its message stays visible. */
export function RetryWebhookButton({
  delivery,
  wide = false,
}: {
  delivery: { id: string; topic: string; merchantName: string; status: string; subscriptionStatus: string };
  wide?: boolean;
}) {
  const [state, action, pending] = useActionState(retryWebhookAction, IDLE);
  const canRetry = delivery.status === 'failed' && delivery.subscriptionStatus !== 'deleted';
  return (
    <div className={`grid gap-1 ${wide ? '' : 'justify-items-end'}`}>
      {canRetry ? (
        <form action={action} className={wide ? 'flex' : undefined}>
          <input type="hidden" name="id" value={delivery.id} />
          <button
            type="submit"
            disabled={pending}
            aria-label={`Retry ${delivery.topic} for ${delivery.merchantName}`}
            className={`${SECONDARY_BUTTON} ${SIZE} ${wide ? 'flex-1' : ''}`}
          >
            <RotateCw aria-hidden="true" className="size-4" />
            {pending ? 'Retrying…' : 'Retry'}
          </button>
        </form>
      ) : null}
      {state.status !== 'idle' ? (
        <p
          role={state.status === 'error' ? 'alert' : 'status'}
          data-testid="webhook-retry-message"
          className={`text-xs ${state.status === 'error' ? 'text-error' : 'text-success'}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
