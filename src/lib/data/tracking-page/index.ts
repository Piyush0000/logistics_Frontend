import { resolveDataSource } from '../source';
import { gatewayTrackingPageService } from './gateway';
import { mockTrackingPageService } from './mock';
import type { TrackingPageService } from './types';

export * from './input';
export * from './types';

export function trackingPageService(): TrackingPageService {
  return resolveDataSource('tracking_page') === 'gateway' ? gatewayTrackingPageService : mockTrackingPageService;
}
