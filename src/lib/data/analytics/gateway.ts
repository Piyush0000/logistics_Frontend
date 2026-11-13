import 'server-only';

import { notAvailable } from '../not-available';
import type { AnalyticsService } from './types';

// The backend has no per-day delivery or revenue route yet. When it does, only this file changes.
export const gatewayAnalyticsService: AnalyticsService = {
  deliveredByDay: notAvailable,
  revenueByDay: notAvailable,
};
