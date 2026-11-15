import 'server-only';

import { notAvailable } from '../not-available';
import type { RatesService } from './types';

// The backend keeps rate cards in order-engine memory and has no route for them, so sample rates never pass as real ones.
export const gatewayRatesService: RatesService = {
  getRateCard: notAvailable,
  // Likewise there is no serviceability or quote route.
  quote: notAvailable,
};
