'use server';

import { getDemoSession } from '@/lib/auth/session';
import { walletService } from '@/lib/data/wallet';
import type { DataResult } from '@/lib/data/source';
import type { WalletBalance } from '@/lib/data/wallet/types';

/** Reloads only the balance for the top-bar chip, instead of re-rendering the whole page. */
export async function refreshWalletBalance(): Promise<DataResult<WalletBalance>> {
  const session = await getDemoSession();
  if (!session) {
    return {
      ok: false,
      source: 'gateway',
      error: { kind: 'unauthorized', status: 401, message: 'Sign in again to see your balance.' },
    };
  }
  return walletService().getBalance();
}
