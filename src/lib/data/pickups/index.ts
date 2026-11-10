import { resolveDataSource } from '../source';
import { gatewayPickupsService } from './gateway';
import { mockPickupsService } from './mock';
import type { PickupService } from './types';

export * from './types';

export function pickupsService(): PickupService {
  return resolveDataSource('pickups') === 'gateway' ? gatewayPickupsService : mockPickupsService;
}
