import 'server-only';

import { notAvailable } from '../../../data/not-available';
import type { AdminSystemService } from './types';

// Each service has a /health route, but the gateway does not aggregate them; there is no audit log store.
// Until a route exists, gateway mode shows this module as unavailable instead of passing sample data off as real.
export const gatewayAdminSystemService: AdminSystemService = {
  getHealth: notAvailable,
  listAuditLog: notAvailable,
};
