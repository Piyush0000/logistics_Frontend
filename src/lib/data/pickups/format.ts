import type { PickupWindow } from './types';

/** A pickup window for display, for example `10:00 to 14:00`. */
export function formatPickupWindow(window: PickupWindow | null): string {
  return window ? `${window.start} to ${window.end}` : 'Any time';
}

export const PICKUP_STATUS_LABELS = {
  scheduled: 'Scheduled',
  picked_up: 'Picked up',
  cancelled: 'Cancelled',
} as const;

export function shipmentCount(count: number): string {
  return `${count} shipment${count === 1 ? '' : 's'}`;
}
