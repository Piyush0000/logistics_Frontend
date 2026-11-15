import 'server-only';

import { resolveDataSource } from '../../../data/source';
import { gatewayAdminShipmentsService } from './gateway';
import { mockAdminShipmentsService } from './mock';
import type { AdminShipmentsService } from './types';

export * from './types';

/** Sample data by default; DATA_SOURCE_ADMIN_SHIPMENTS=gateway switches to the backend. */
export function adminShipmentsService(): AdminShipmentsService {
  return resolveDataSource('admin_shipments') === 'gateway' ? gatewayAdminShipmentsService : mockAdminShipmentsService;
}
