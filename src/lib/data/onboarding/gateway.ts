import 'server-only';

import { notAvailable } from '../not-available';
import type { OnboardingService } from './types';

// The backend has no route for setup progress yet.
export const gatewayOnboardingService: OnboardingService = {
  getChecklist: notAvailable,
};
