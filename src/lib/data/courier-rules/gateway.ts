import { notAvailable } from '../not-available';
import type { CourierRulesService } from './types';

// The order engine reads `request.preference`, but the contract strips it and the backend has no
// settings route, so sample rules never pass as the real ones.
export const gatewayCourierRulesService: CourierRulesService = {
  get: notAvailable,
  save: notAvailable,
};
