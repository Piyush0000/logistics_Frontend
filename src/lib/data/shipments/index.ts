import { resolveDataSource } from '../source';
import { gatewayShipmentService } from './gateway';
import { mockShipmentService } from './mock';

export type { ShipmentSummary } from './summary';

export function shipmentService() {
  return resolveDataSource('shipments') === 'gateway'
    ? gatewayShipmentService
    : mockShipmentService;
}
