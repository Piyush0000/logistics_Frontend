import { notAvailable } from '../not-available';
import type { SubMerchantService } from './types';

// The backend has no sub-merchant route yet (the PRD's /v1/merchants/onboard is not built), so
// sample sellers never pass as real ones.
export const gatewaySubMerchantService: SubMerchantService = {
  list: notAvailable,
  onboard: notAvailable,
};
