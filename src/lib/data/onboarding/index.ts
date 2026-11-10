import { resolveDataSource } from '../source';
import { gatewayOnboardingService } from './gateway';
import { mockOnboardingService } from './mock';
import type { OnboardingService } from './types';

export * from './types';

export function onboardingService(): OnboardingService {
  return resolveDataSource('onboarding') === 'gateway'
    ? gatewayOnboardingService
    : mockOnboardingService;
}
