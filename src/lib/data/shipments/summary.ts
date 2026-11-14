import type { ShipmentStats } from '../../gateway/schemas/shipments';

export interface ShipmentSummary {
  toBeProcessed: number;
  readyToShip: number;
  inTransit: number;
  outForDelivery: number;
  delivered: number;
  rto: number;
}

export function toShipmentSummary(stats: ShipmentStats): ShipmentSummary {
  return {
    // Booked but not yet accepted by order-engine still needs processing.
    toBeProcessed: stats.CREATE_REQUESTED + stats.PICKUP_SCHEDULED,
    readyToShip: stats.MANIFESTED,
    inTransit: stats.IN_TRANSIT,
    outForDelivery: stats.OUT_FOR_DELIVERY,
    delivered: stats.DELIVERED,
    rto: stats.RTO_INITIATED + stats.RTO_DELIVERED,
  };
}
