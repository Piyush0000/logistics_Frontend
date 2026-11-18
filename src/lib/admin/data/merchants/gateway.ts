import 'server-only';

import { notAvailable } from '../../../data/not-available';
import type { AdminMerchantsService } from './types';

// No merchant service or route exists in the backend yet.
// Until a route exists, gateway mode shows this module as unavailable instead of passing sample data off as real.
export const gatewayAdminMerchantsService: AdminMerchantsService = {
  listMerchants: notAvailable,
  getMerchant: notAvailable,
  setMerchantStatus: notAvailable,
};
