import { fromMock } from '../source';
import type { ShipmentSummary } from './summary';

const SAMPLE: ShipmentSummary = {
  toBeProcessed: 12,
  readyToShip: 8,
  inTransit: 34,
  outForDelivery: 9,
  delivered: 126,
  rto: 7,
};

export const mockShipmentService = {
  async getSummary() {
    return fromMock(SAMPLE);
  },
};
