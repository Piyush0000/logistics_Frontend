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
    toBeProcessed: stats.PICKUP_SCHEDULED,
    readyToShip: stats.MANIFESTED,
    inTransit: stats.IN_TRANSIT,
    outForDelivery: stats.OUT_FOR_DELIVERY,
    delivered: stats.DELIVERED,
    rto: stats.RTO_INITIATED + stats.RTO_DELIVERED,
  };
}
