import 'server-only';

import { notAvailable } from '../../../data/not-available';
import type { AdminShipmentsService } from './types';

// order-engine GET /v1/shipments (internal key, all merchants) exists but the gateway does not expose an admin route.
// Until a route exists, gateway mode shows this module as unavailable instead of passing sample data off as real.
export const gatewayAdminShipmentsService: AdminShipmentsService = {
  listShipments: notAvailable,
};
