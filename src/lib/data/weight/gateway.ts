import { notAvailable } from '../not-available';
import type { WeightService } from './types';

// The backend has no weight discrepancy route yet, so sample rows never pass as real ones.
export const gatewayWeightService: WeightService = {
  getSummary: notAvailable,
  listDiscrepancies: notAvailable,
  accept: notAvailable,
  dispute: notAvailable,
};
