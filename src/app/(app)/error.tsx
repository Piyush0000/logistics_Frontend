'use client';

import Link from 'next/link';
import { AppShell } from '@/components/shell/app-shell';
import { useShellEmail } from '@/components/shell/shell-identity';
import { PANEL_PRIMARY, PANEL_SECONDARY, StatusPanel } from '@/components/ui/status-panel';
import type { DataResult } from '@/lib/data/source';
import type { WalletBalance } from '@/lib/data/wallet';

/** The wallet is not reloaded here, because loading it may be what failed. */
const WALLET_UNKNOWN: DataResult<WalletBalance> = {
  ok: false,
  source: 'gateway',
  error: { kind: 'unavailable', status: 0, message: 'Wallet balance is not loaded.' },
};

// Next 16.3+ passes `retry`, which re-fetches the page; `reset` would only re-render it.
export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const email = useShellEmail();
  const panel = (
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
  if (!email) return <div className="grid min-h-dvh place-items-center p-4">{panel}</div>;
  return (
    <AppShell email={email} wallet={WALLET_UNKNOWN}>
      {panel}
    </AppShell>
  );
}
