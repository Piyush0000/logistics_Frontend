import 'server-only';

import { notAvailable } from '../not-available';
import type { CompanyService } from './types';

// The gateway has no merchant onboarding route (the PRD's /v1/merchants/onboard is not there),
// so sample company details never pass as real ones.
export const gatewayCompanyService: CompanyService = {
  getCompany: notAvailable,
  saveCompany: notAvailable,
};
