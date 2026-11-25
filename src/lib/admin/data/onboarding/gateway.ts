import 'server-only';

import { z } from 'zod';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken, mapResult } from '../admin-fetch';
import { identityMerchantSchema, type IdentityMerchant } from '../merchants/gateway';
import type { AdminOnboardingService, ApplicationStatus, OnboardingApplication } from './types';

// A KYC application is the merchant itself: identity keeps one KYC status per merchant, so the
// application id is the merchant id. The detail adds what the merchant submitted.
const KYC_BY_STATUS: Record<ApplicationStatus, string> = {
  // Sent for review. Merchants who have not sent anything yet have nothing to review.
  pending: 'PENDING',
  approved: 'VERIFIED',
  rejected: 'REJECTED',
};

const listSchema = z.object({ items: z.array(identityMerchantSchema), total: z.number() });

const DOC_KIND = { gst: 'gst_certificate', pan: 'pan_card', cheque: 'cancelled_cheque' } as const;

const submissionSchema = z.object({
  details: z
    .object({
      gstin: z.string(),
      pan: z.string(),
      legal_name: z.string(),
      address: z.object({ city: z.string() }).passthrough(),
    })
    .passthrough()
    .nullable(),
  submitted_at: z.string().nullable(),
  documents: z.array(z.object({ kind: z.enum(['gst', 'pan', 'cheque']), name: z.string(), size: z.number() })),
});

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
    const [merchant, submission] = await Promise.all([
      gatewayFetch(`/api/v1/admin/merchants/${encodeURIComponent(id)}`, {
        schema: identityMerchantSchema,
        token: adminToken(),
      }),
      gatewayFetch(`/api/v1/admin/merchants/${encodeURIComponent(id)}/kyc`, {
        schema: submissionSchema,
        token: adminToken(),
      }),
    ]);
    if (!submission.ok) return mapResult(merchant, toApplication);
    return mapResult(merchant, (m) => {
      const s = submission.data;
      return {
        ...toApplication(m),
        businessName: s.details?.legal_name || m.name,
        city: s.details?.address.city ?? '',
        gstin: s.details?.gstin ?? null,
        pan: s.details?.pan ?? null,
        submittedAt: s.submitted_at ?? m.created_at,
        documents: s.documents.map((d) => ({ kind: DOC_KIND[d.kind], fileName: d.name, size: d.size })),
      };
    });
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
