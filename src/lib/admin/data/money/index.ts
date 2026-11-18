import 'server-only';

import { resolveDataSource } from '../../../data/source';
import { gatewayAdminMoneyService } from './gateway';
import { mockAdminMoneyService } from './mock';
import type { AdminMoneyService } from './types';

export * from './types';

/** Sample data by default; DATA_SOURCE_ADMIN_MONEY=gateway switches to the backend. */
export function adminMoneyService(): AdminMoneyService {
  return resolveDataSource('admin_money') === 'gateway' ? gatewayAdminMoneyService : mockAdminMoneyService();
}
