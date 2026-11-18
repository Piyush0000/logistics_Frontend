import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { notAvailable } from '../not-available';
import { fromGateway } from '../source';
import { mockWalletService } from './mock';
import type { WalletService } from './types';

/** GET /api/v1/wallet: ledger balances in integer paise. */
const WalletSchema = z.object({
  available: z.number().int(),
  reserved: z.number().int(),
  pendingCod: z.number().int(),
});

export async function fetchWalletBalance(token: string | null) {
  const result = await gatewayFetch('/api/v1/wallet', { schema: WalletSchema, token });
  return fromGateway(
    result.ok ? { ...result, data: { availablePaise: result.data.available } } : result,
  );
}

export const gatewayWalletService: WalletService = {
  async getBalance() {
    return fetchWalletBalance(await merchantCredential('shipments'));
  },
  // No service lists ledger entries yet, so the list stays labelled sample data.
  listTransactions: mockWalletService.listTransactions,
  // No recharge route yet (PRD POST /v1/wallet/recharge); nothing is charged.
  startRecharge: notAvailable,
};
