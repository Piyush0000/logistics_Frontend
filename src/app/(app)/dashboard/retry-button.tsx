'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="h-control rounded-control bg-primary px-4 text-sm font-medium text-on-primary disabled:bg-primary/50"
    >
      Try again
    </button>
  );
}
