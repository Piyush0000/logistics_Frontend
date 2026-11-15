import 'server-only';

import { notAvailable } from '../../../data/not-available';
import type { AdminPricingService } from './types';

// order-engine has a RateCard table but no admin route to read or change it.
// Until a route exists, gateway mode shows this module as unavailable instead of passing sample data off as real.
export const gatewayAdminPricingService: AdminPricingService = {
  listRateCard: notAvailable,
  listCouriers: notAvailable,
};
