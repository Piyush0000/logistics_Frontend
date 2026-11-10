import { ordersService } from '../orders';
import { notAvailable } from '../not-available';
import type { PickupService } from './types';

// The backend has no route for pickups yet (`pickup.schedule.requested` has no producer), so only
// the list of shipments ready to ship is real. It comes from the shipments list route.
export const gatewayPickupsService: PickupService = {
  listPickups: notAvailable,
  schedulePickup: notAvailable,
  getPickup: notAvailable,

  async readyToShip() {
    const result = await ordersService().listOrders({ status: 'MANIFESTED', limit: 100, page: 1 });
    return result.ok ? { ...result, data: result.data.items } : result;
  },
};
