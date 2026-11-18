import 'server-only';

import { resolveDataSource } from '../../../data/source';
import { gatewayAdminOnboardingService } from './gateway';
import { mockAdminOnboardingService } from './mock';
import type { AdminOnboardingService } from './types';

export * from './types';
export { countPendingApplications, resetMockApplications } from './mock';

/** Sample data by default; DATA_SOURCE_ADMIN_ONBOARDING=gateway switches to the backend. */
export function adminOnboardingService(): AdminOnboardingService {
  return resolveDataSource('admin_onboarding') === 'gateway' ? gatewayAdminOnboardingService : mockAdminOnboardingService;
}
