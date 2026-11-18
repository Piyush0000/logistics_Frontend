import 'server-only';

import { resolveDataSource } from '../../../data/source';
import { cleanAuditEntry } from './audit';
import { gatewayAdminSystemService } from './gateway';
import { mockAdminSystemService } from './mock';
import type { AdminSystemService, AuditInput } from './types';

export * from './types';

/** Sample data by default; DATA_SOURCE_ADMIN_SYSTEM=gateway switches to the backend. */
export function adminSystemService(): AdminSystemService {
  return resolveDataSource('admin_system') === 'gateway' ? gatewayAdminSystemService : mockAdminSystemService();
}

/**
 * Records an admin change in the audit log. Call it from every admin server action, after the
 * change has succeeded and after requireAdminSession():
 *
 *   await recordAudit({ action: 'Suspended merchant', target: 'mer_004 · Sahyadri Organics', detail: reason });
 *
 * It never throws. If the log cannot be written, the change still stands and a warning is logged,
 * because a missing audit line is better than undoing a change the admin already made.
 */
export async function recordAudit(entry: AuditInput): Promise<void> {
  const result = await adminSystemService()
    .recordAudit(cleanAuditEntry(entry))
    .catch(() => null);
  if (!result?.ok) console.warn(`Audit entry not recorded: ${entry.action}`);
}
