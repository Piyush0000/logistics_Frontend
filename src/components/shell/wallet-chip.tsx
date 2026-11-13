import { loadWallet } from '@/lib/data/request-cache';
import { WalletChipView } from './wallet-chip-view';

/** Streams in on its own (inside Suspense in the layout), so a slow wallet never holds the page. */
export async function WalletChip() {
  const balance = await loadWallet();
  return <WalletChipView initial={balance} />;
}

export function WalletChipSkeleton() {
  return (
    <span
      aria-hidden="true"
      className="block h-control w-32 animate-pulse rounded-control bg-secondary/60 lg:w-36"
    />
  );
}
