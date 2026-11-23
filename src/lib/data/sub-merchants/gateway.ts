import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import { SUB_MERCHANT_PAGE_SIZE, type SubMerchant, type SubMerchantService } from './types';

const KYC: Record<string, SubMerchant['kycStatus']> = {
  NOT_STARTED: 'not_started',
  PENDING: 'submitted',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};
const schema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  gstin: z.string().nullable(),
  kyc_status: z.string(),
  bank_last4: z.string(),
  created_at: z.string(),
});
const toSubMerchant = (s: z.infer<typeof schema>): SubMerchant => ({
  id: s.id,
  name: s.name,
  email: s.email,
  gstin: s.gstin,
  kycStatus: KYC[s.kyc_status] ?? 'not_started',
  bankLast4: s.bank_last4,
  createdAt: s.created_at,
});

/** Sub-merchants from /api/v1/settings/sub-merchants. */
export const gatewaySubMerchantService: SubMerchantService = {
  async list({ page, search }) {
    const result = await gatewayFetch('/api/v1/settings/sub-merchants', {
      schema: z.object({ items: z.array(schema), page: z.number(), limit: z.number(), total: z.number() }),
      token: await merchantCredential('shipments'),
      query: { page, q: search.trim() || undefined, limit: SUB_MERCHANT_PAGE_SIZE },
    });
    if (!result.ok) return fromGateway(result);
    const { items, total, limit } = result.data;
    return fromGateway({
      ...result,
      data: { items: items.map(toSubMerchant), page: result.data.page, pageCount: Math.max(1, Math.ceil(total / limit)), total },
    });
  },
  async onboard(input) {
    const result = await gatewayFetch('/api/v1/settings/sub-merchants', {
      method: 'POST',
      schema,
      token: await merchantCredential('shipments'),
      body: { name: input.name, email: input.email, gstin: input.gstin, bank: input.bank },
    });
    return fromGateway(result.ok ? { ...result, data: toSubMerchant(result.data) } : result);
  },
};
