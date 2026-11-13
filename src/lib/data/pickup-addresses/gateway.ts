import 'server-only';

import { notAvailable } from '../not-available';
import type { PickupAddressService } from './types';

// The backend has no route for saved pickup addresses yet.
export const gatewayPickupAddressService: PickupAddressService = {
  list: notAvailable,
  save: notAvailable,
  remove: notAvailable,
  makeDefault: notAvailable,
};
