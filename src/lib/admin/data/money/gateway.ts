import 'server-only';

import { notAvailable } from '../../../data/not-available';
import type { AdminMoneyService } from './types';

// ledger-engine /v1/wallet and reconciliation routes exist but are not exposed through the gateway for admins.
// Until a route exists, gateway mode shows this module as unavailable instead of passing sample data off as real.
export const gatewayAdminMoneyService: AdminMoneyService = {
  listWallets: notAvailable,
  getMerchantWallet: notAvailable,
  listRemittances: notAvailable,
};
