import 'server-only';

import { notAvailable } from '../../../data/not-available';
import type { AdminOnboardingService } from './types';

// No onboarding or KYC route exists in the backend yet.
// Until a route exists, gateway mode shows this module as unavailable instead of passing sample data off as real.
export const gatewayAdminOnboardingService: AdminOnboardingService = {
  listApplications: notAvailable,
  getApplication: notAvailable,
};
