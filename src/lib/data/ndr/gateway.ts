import 'server-only';

import { notAvailable } from '../not-available';
import type { NdrService } from './types';

// The backend has no NDR route and no NDR status, so nothing here can be real yet.
export const gatewayNdrService: NdrService = {
  getNdrDashboard: notAvailable,
  takeNdrAction: notAvailable,
};
