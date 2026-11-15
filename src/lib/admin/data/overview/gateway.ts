import 'server-only';

import { notAvailable } from '../../../data/not-available';
import type { AdminOverviewService } from './types';

// No platform-wide stats route in the gateway yet (order-engine /v1/shipments/stats counts every merchant when called without x-merchant-id).
// Until a route exists, gateway mode shows this module as unavailable instead of passing sample data off as real.
export const gatewayAdminOverviewService: AdminOverviewService = {
  getOverview: notAvailable,
};
