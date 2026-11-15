import 'server-only';

import { notAvailable } from '../../../data/not-available';
import type { AdminSupportService } from './types';

// No support ticket route exists in the backend yet.
// Until a route exists, gateway mode shows this module as unavailable instead of passing sample data off as real.
export const gatewayAdminSupportService: AdminSupportService = {
  listTickets: notAvailable,
};
