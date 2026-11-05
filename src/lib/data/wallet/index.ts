import { notAvailable } from '../not-available';
import { fromMock, resolveDataSource, type DataResult } from '../source';

export interface WalletBalance {
  availablePaise: number;
}

interface WalletService {
  getBalance(): Promise<DataResult<WalletBalance>>;
}

const mockWalletService: WalletService = {
  async getBalance() {
    return fromMock({ availablePaise: 1250000 });
  },
};

// The ledger has a wallet route, but the gateway does not expose it yet.
const gatewayWalletService: WalletService = { getBalance: notAvailable };

export function walletService(): WalletService {
  return resolveDataSource('wallet') === 'gateway' ? gatewayWalletService : mockWalletService;
}
