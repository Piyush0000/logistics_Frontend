import { notAvailable } from '../not-available';
import type { CodService } from './types';

// The reconciliation service has COD routes, but the gateway does not expose them,
// and no service offers a per-order remittance list yet.
export const gatewayCodService: CodService = {
  getSummary: notAvailable,
  listRemittances: notAvailable,
  exportRemittances: notAvailable,
};
