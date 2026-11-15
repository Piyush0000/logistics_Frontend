import 'server-only';

import { resolveDataSource } from '../source';
import { gatewayPickupAddressService } from './gateway';
import { mockPickupAddressService } from './mock';
import type { PickupAddressService } from './types';

export * from './types';

export function pickupAddressService(): PickupAddressService {
  return resolveDataSource('pickup_addresses') === 'gateway'
    ? gatewayPickupAddressService
    : mockPickupAddressService;
}
