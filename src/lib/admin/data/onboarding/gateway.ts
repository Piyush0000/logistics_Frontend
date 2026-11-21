import 'server-only';

import { z } from 'zod';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken, mapResult } from '../admin-fetch';
import { identityMerchantSchema, type IdentityMerchant } from '../merchants/gateway';
import type { AdminOnboardingService, ApplicationStatus, OnboardingApplication } from './types';

// A KYC application is the merchant itself: identity keeps one KYC status per merchant, so the
// application id is the merchant id. Merchants do not upload documents yet, so the list is empty.
const KYC_BY_STATUS: Record<ApplicationStatus, string> = {
  pending: 'NOT_STARTED,PENDING',
  approved: 'VERIFIED',
  rejected: 'REJECTED',
};

const listSchema = z.object({ items: z.array(identityMerchantSchema), total: z.number() });

function toApplication(m: IdentityMerchant): OnboardingApplication {
  const status: ApplicationStatus =
    m.kyc_status === 'VERIFIED' ? 'approved' : m.kyc_status === 'REJECTED' ? 'rejected' : 'pending';
  return {
    id: m.id,
    merchantId: m.id,
    businessName: m.name,
    email: m.owner_email ?? '',
    city: '',
    gstin: null,
    pan: null,
    submittedAt: m.created_at,
    status,
    documents: [],
    rejectionReason: status === 'rejected' ? (m.kyc_note ?? undefined) : undefined,
  };
}

export const gatewayAdminOnboardingService: AdminOnboardingService = {
  async listApplications(status) {
    const result = await gatewayFetch('/api/v1/admin/merchants', {
      schema: listSchema,
      token: adminToken(),
      query: {
        kyc: status ? KYC_BY_STATUS[status] : undefined,
        status: status === 'pending' ? 'ACTIVE' : undefined,
        limit: 100,
      },
    });
    return mapResult(result, (data) => data.items.map(toApplication));
  },

  async getApplication(id) {
    const result = await gatewayFetch(`/api/v1/admin/merchants/${encodeURIComponent(id)}`, {
      schema: identityMerchantSchema,
      token: adminToken(),
    });
    return mapResult(result, toApplication);
  },

  async decide(id, decision, reason) {
    const result = await gatewayFetch(`/api/v1/admin/merchants/${encodeURIComponent(id)}/kyc`, {
      method: 'POST',
      body: decision === 'approved' ? { status: 'VERIFIED' } : { status: 'REJECTED', note: reason },
      schema: identityMerchantSchema,
      token: adminToken(),
    });
    return mapResult(result, toApplication);
  },
};
