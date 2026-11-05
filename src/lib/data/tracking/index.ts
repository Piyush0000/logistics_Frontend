import { resolveDataSource } from '../source';
import { gatewayTrackingService } from './gateway';
import { mockTrackingService } from './mock';

export type { TrackingSummary } from './types';

export function trackingService() {
  return resolveDataSource('tracking') === 'gateway' ? gatewayTrackingService : mockTrackingService;
}
