import 'server-only';

import { resolveDataSource } from '../../../data/source';
import { gatewayAdminSupportService } from './gateway';
import { mockAdminSupportService } from './mock';
import type { AdminSupportService } from './types';

export * from './types';

/** Sample data by default; DATA_SOURCE_ADMIN_SUPPORT=gateway switches to the backend. */
export function adminSupportService(): AdminSupportService {
  return resolveDataSource('admin_support') === 'gateway' ? gatewayAdminSupportService : mockAdminSupportService;
}
