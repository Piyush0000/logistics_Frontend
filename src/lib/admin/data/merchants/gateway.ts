import 'server-only';

import { z } from 'zod';
import { fromGateway, type DataResult } from '../../../data/source';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken, mapResult } from '../admin-fetch';
import { ADMIN_PAGE_SIZE } from '../common';
import type {
  AdminMerchantsService,
  KycStatus,
  MerchantDetail,
  MerchantStatus,
  MerchantSummary,
} from './types';

/** A merchant as identity stores it (GET /api/v1/admin/merchants). */
export const identityMerchantSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  kyc_status: z.enum(['NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED']),
  kyc_note: z.string().nullable(),
  kyc_reviewed_at: z.string().nullable(),
  owner_email: z.string().nullable(),
  owner_name: z.string().nullable(),
  created_at: z.string(),
});
export type IdentityMerchant = z.infer<typeof identityMerchantSchema>;

const listedSchema = identityMerchantSchema.extend({
  wallet_available_paise: z.number(),
  shipments_30d: z.number(),
});

const listSchema = z.object({
  items: z.array(listedSchema),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

const detailSchema = listedSchema.extend({
  wallet_reserved_paise: z.number(),
  shipments_by_status: z.array(z.object({ status: z.string(), count: z.number() })),
});

const KYC: Record<IdentityMerchant['kyc_status'], KycStatus> = {
  NOT_STARTED: 'not_started',
  PENDING: 'submitted',
  VERIFIED: 'approved',
  REJECTED: 'rejected',
};

/** Suspended wins; an active merchant counts as active only once KYC is approved (it can book). */
export function merchantStatus(m: Pick<IdentityMerchant, 'status' | 'kyc_status'>): MerchantStatus {
  if (m.status === 'SUSPENDED') return 'suspended';
  return m.kyc_status === 'VERIFIED' ? 'active' : 'pending';
}

function toSummary(m: z.infer<typeof listedSchema>): MerchantSummary {
  return {
    id: m.id,
    name: m.name,
    email: m.owner_email ?? '',
    // Sign-up does not ask for a city yet.
    city: '',
    status: merchantStatus(m),
    kyc: KYC[m.kyc_status],
    joinedAt: m.created_at.slice(0, 10),
    shipments30d: m.shipments_30d,
    walletPaise: m.wallet_available_paise,
  };
}

function toDetail(m: z.infer<typeof detailSchema>): MerchantDetail {
  return {
    ...toSummary(m),
    phone: m.phone,
    gstin: null,
    shipmentsByStatus: m.shipments_by_status,
    notes: m.kyc_note ? [`KYC: ${m.kyc_note}`] : [],
  };
}

/** The list filter, translated to identity's: "pending" means active but not KYC-approved. */
function statusQuery(status?: MerchantStatus): Record<string, string | undefined> {
  if (status === 'suspended') return { status: 'SUSPENDED' };
  if (status === 'active') return { status: 'ACTIVE', kyc: 'VERIFIED' };
  if (status === 'pending') return { status: 'ACTIVE', kyc: 'NOT_STARTED,PENDING,REJECTED' };
  return {};
}

async function getMerchant(id: string): Promise<DataResult<MerchantDetail>> {
  const result = await gatewayFetch(`/api/v1/admin/merchants/${encodeURIComponent(id)}`, {
    schema: detailSchema,
    token: adminToken(),
  });
  return mapResult(result, toDetail);
}

export const gatewayAdminMerchantsService: AdminMerchantsService = {
  async listMerchants({ q, status, page = 1 }) {
    const result = await gatewayFetch('/api/v1/admin/merchants', {
      schema: listSchema,
      token: adminToken(),
      query: { q: q?.trim() || undefined, page, limit: ADMIN_PAGE_SIZE, ...statusQuery(status) },
    });
    return mapResult(result, (data) => ({
      items: data.items.map(toSummary),
      page: data.page,
      pageSize: data.limit,
      total: data.total,
    }));
  },

  getMerchant,

  async setMerchantStatus(id, status) {
    // "Pending" is not a switch: it follows from KYC. Approve or reject KYC in Onboarding.
    if (status === 'pending') {
      return {
        ok: false,
        source: 'gateway',
        error: {
          kind: 'validation',
          status: 400,
          message: 'A merchant becomes pending through KYC review, not by status change.',
        },
      };
    }
    const result = await gatewayFetch(`/api/v1/admin/merchants/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      body: { status: status === 'suspended' ? 'SUSPENDED' : 'ACTIVE' },
      token: adminToken(),
    });
    if (!result.ok) return fromGateway(result);
    return getMerchant(id);
  },
};
