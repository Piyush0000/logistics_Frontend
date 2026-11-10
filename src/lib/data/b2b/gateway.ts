import { notAvailable } from '../not-available';
import type { B2bService } from './types';

// The backend has no B2B route, and its contracts only cover single-parcel shipments.
export const gatewayB2bService: B2bService = {
  listShipments: notAvailable,
  createShipment: notAvailable,
};
