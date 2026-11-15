import 'server-only';

import { resolveDataSource } from '../../../data/source';
import { gatewayAdminSystemService } from './gateway';
import { mockAdminSystemService } from './mock';
import type { AdminSystemService } from './types';

export * from './types';

/** Sample data by default; DATA_SOURCE_ADMIN_SYSTEM=gateway switches to the backend. */
export function adminSystemService(): AdminSystemService {
  return resolveDataSource('admin_system') === 'gateway' ? gatewayAdminSystemService : mockAdminSystemService;
}
