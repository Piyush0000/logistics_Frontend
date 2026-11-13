'use client';

import Link from 'next/link';
import { PANEL_PRIMARY, PANEL_SECONDARY, StatusPanel } from '@/components/ui/status-panel';

/** Renders inside the (app) layout, so the menu, top bar and wallet chip stay on screen. */
// Next 16.3+ passes `retry`, which re-fetches the page; `reset` would only re-render it.
export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <StatusPanel
      title="Something went wrong on this page."
      message="Your data is safe. Try again, or go back to Home."
    >
      <button type="button" onClick={() => retry()} className={PANEL_PRIMARY}>
        Try again
      </button>
      <Link href="/home" className={PANEL_SECONDARY}>
        Go to Home
      </Link>
    </StatusPanel>
  );
}
