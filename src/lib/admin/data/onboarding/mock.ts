import 'server-only';

import { fromMock } from '../../../data/source';
import { mockNotFound } from '../not-found';
import { daysAgo, SEED_MERCHANTS } from '../seed';
import type { AdminOnboardingService, OnboardingApplication } from './types';

const DOCS = (prefix: string): OnboardingApplication['documents'] => [
  { kind: 'gst_certificate', fileName: `${prefix}-gst.pdf`, size: 412_000 },
  { kind: 'pan_card', fileName: `${prefix}-pan.jpg`, size: 186_000 },
  { kind: 'cancelled_cheque', fileName: `${prefix}-cheque.png`, size: 233_000 },
];

// Applications for the pending sample merchants, plus decided ones so every status has rows.
const APPLICATIONS: OnboardingApplication[] = [
  ...SEED_MERCHANTS.filter((merchant) => merchant.kyc === 'submitted').map(
    (merchant, index): OnboardingApplication => ({
      id: `app_${merchant.id}`,
      merchantId: merchant.id,
      businessName: merchant.name,
      email: merchant.email,
      city: merchant.city,
      gstin: index === 0 ? '32AAACC6789L1Z7' : null,
      pan: index === 0 ? 'AAACC6789L' : 'AAACM7890M',
      submittedAt: daysAgo(index + 1, 3),
      status: 'pending',
      documents: DOCS(merchant.id),
    }),
  ),
  {
    id: 'app_mer_005',
    merchantId: 'mer_005',
    businessName: 'Pixel Gadgets',
    email: 'orders@pixelgadgets.example',
    city: 'Delhi',
    gstin: '07AAACP5678K1Z4',
    pan: 'AAACP5678K',
    submittedAt: daysAgo(96),
    status: 'approved',
    documents: DOCS('mer_005'),
  },
  {
    id: 'app_rejected_01',
    merchantId: 'mer_x01',
    businessName: 'Quick Mart Traders',
    email: 'admin@quickmart.example',
    city: 'Lucknow',
    gstin: '09AAAQM0000A1Z0',
    pan: 'AAAQM0000A',
    submittedAt: daysAgo(12),
    status: 'rejected',
    documents: DOCS('mer_x01').slice(0, 2),
    rejectionReason: 'Cancelled cheque missing; GSTIN does not match the business name.',
  },
];

export const mockAdminOnboardingService: AdminOnboardingService = {
  async listApplications(status) {
    const rows = APPLICATIONS.filter((application) => !status || application.status === status).sort((a, b) =>
      b.submittedAt.localeCompare(a.submittedAt),
    );
    return fromMock(rows);
  },

  async getApplication(id) {
    const application = APPLICATIONS.find((entry) => entry.id === id);
    return application ? fromMock(application) : mockNotFound('Application');
  },
};
