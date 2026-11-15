import 'server-only';

import { cache } from 'react';
import { ndrService } from './ndr';
import { onboardingService } from './onboarding';
import { shipmentService } from './shipments';
import { walletService } from './wallet';

/**
 * Loaders shared by several server components on one page (the wallet chip, Home's cards and the
 * insights). React's cache() runs each once per request, however many components ask.
 */
export const loadWallet = cache(() => walletService().getBalance());
export const loadShipmentSummary = cache(() => shipmentService().getSummary());
export const loadNdrDashboard = cache(() => ndrService().getNdrDashboard());
export const loadChecklist = cache(() => onboardingService().getChecklist());
