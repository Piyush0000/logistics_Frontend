import type { OrderSummary } from '../orders/types';
import type { DataResult } from '../source';

export interface PickupWindow {
  start: string;
  end: string;
}

export interface Pickup {
  id: string;
  pickupDate: string;
  window: PickupWindow | null;
  carrier: string;
  addressLabel: string;
  awbs: string[];
  status: 'scheduled' | 'picked_up' | 'cancelled';
}

export interface PickupInput {
  pickupDate: string;
  window: PickupWindow | null;
  awbs: string[];
  pickupAddressId: string;
}

export interface PickupService {
  listPickups(query: {
    page: number;
  }): Promise<DataResult<{ items: Pickup[]; page: number; pageCount: number }>>;
  /** MANIFESTED shipments, which are the ones a courier can collect. */
  readyToShip(): Promise<DataResult<OrderSummary[]>>;
  schedulePickup(input: PickupInput): Promise<DataResult<Pickup>>;
  /** One pickup, for its printable manifest. */
  getPickup(id: string): Promise<DataResult<Pickup>>;
}

export const PICKUPS_PAGE_SIZE = 10;
export const MAX_AWBS_PER_PICKUP = 100;
export const MAX_PICKUP_DAYS_AHEAD = 7;
export const ONE_COURIER_MESSAGE = 'Select shipments from one courier per pickup.';
