import 'server-only';

import { resolveDataSource } from '../source';
import { gatewayAnalyticsService } from './gateway';
import { mockAnalyticsService } from './mock';
import type { AnalyticsService } from './types';

export * from './types';

export function analyticsService(): AnalyticsService {
  return resolveDataSource('analytics') === 'gateway' ? gatewayAnalyticsService : mockAnalyticsService;
}
