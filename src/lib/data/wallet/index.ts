import { resolveDataSource } from '../source';
import { gatewayWalletService } from './gateway';
import { mockWalletService } from './mock';
import type { WalletService } from './types';

export type { WalletBalance, WalletTransaction, WalletTransactionPage } from './types';

export function walletService(): WalletService {
  return resolveDataSource('wallet') === 'gateway' ? gatewayWalletService : mockWalletService;
}
