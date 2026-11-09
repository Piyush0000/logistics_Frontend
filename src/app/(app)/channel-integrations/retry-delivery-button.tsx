'use client';

import { useState, useTransition } from 'react';
import { retryDeliveryAction } from './actions';
import { SECONDARY_BUTTON } from './dialog';

export function RetryDeliveryButton({ id }: { id: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function retry() {
    setMessage(null);
    startTransition(async () => {
      const result = await retryDeliveryAction(id);
      if (!result.ok) setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-1 sm:items-end">
      <button type="button" disabled={pending} onClick={retry} className={SECONDARY_BUTTON}>
        Retry
      </button>
      {message ? (
        <p role="alert" className="text-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
}
