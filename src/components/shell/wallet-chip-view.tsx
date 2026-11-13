'use client';

import { RefreshCw, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { DataResult } from '@/lib/data/source';
import type { WalletBalance } from '@/lib/data/wallet/types';
import { formatPaise } from '@/lib/format/money';
import { refreshWalletBalance } from './wallet-actions';

export function WalletChipView({ initial }: { initial: DataResult<WalletBalance> }) {
  const [wallet, setWallet] = useState(initial);
  const [pending, startTransition] = useTransition();

  const refresh = () =>
    startTransition(async () => {
      setWallet(await refreshWalletBalance());
    });

  return (
    <div className="flex">
      <Link
        href="/finances/wallet"
        data-testid="wallet"
        className="flex h-control items-center gap-2 rounded-l-control border border-r-0 border-secondary bg-muted px-3 text-primary transition-colors duration-150 hover:bg-primary hover:text-on-primary"
      >
        <Wallet aria-hidden="true" className="hidden size-4 sm:block" />
        <span className="flex flex-col items-end leading-none lg:flex-row lg:items-center lg:gap-2">
          <span className="font-mono text-sm font-medium">
            {wallet.ok ? formatPaise(wallet.data.availablePaise) : 'Unavailable'}
          </span>
          {wallet.source === 'mock' ? (
            <span className="text-[10px] leading-3 opacity-80">Sample</span>
          ) : null}
        </span>
      </Link>
      <button
        type="button"
        aria-label="Refresh balance"
        disabled={pending}
        onClick={refresh}
        className="grid h-control w-11 place-items-center rounded-r-control border border-secondary bg-surface text-on-surface/70 transition-colors duration-150 hover:text-primary lg:w-9"
      >
        <RefreshCw aria-hidden="true" className={`size-4 ${pending ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
