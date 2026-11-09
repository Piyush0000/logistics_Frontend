import { notAvailable } from '../not-available';
import type { WalletService } from './types';

// The ledger has an internal balance route, but the gateway does not expose it,
// and no service offers a transaction list yet.
export const gatewayWalletService: WalletService = {
  getBalance: notAvailable,
  listTransactions: notAvailable,
};
