import 'server-only';

import { AddressSchema } from '@logicore/contracts';
import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { maskAccount } from '../../kyc';
import { fromGateway } from '../source';
import type { CompanyService, DocumentKind, KycStatus } from './types';

const KYC: Record<string, KycStatus> = {
  NOT_STARTED: 'not_started',
  PENDING: 'submitted',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};
const kycOf = (status: string): KycStatus => KYC[status] ?? 'not_started';

const companySchema = z.object({
  details: z
    .object({
      legal_name: z.string(),
      brand_name: z.string(),
      gstin: z.string(),
      pan: z.string(),
      address: AddressSchema,
      bank: z.object({ holder: z.string(), account: z.string(), ifsc: z.string() }),
    })
    .nullable(),
  kyc_status: z.string(),
  documents: z.array(z.object({ kind: z.enum(['gst', 'pan', 'cheque']), name: z.string() })),
});

/** Company details and KYC from /api/v1/account. The account number comes back masked only. */
export const gatewayCompanyService: CompanyService = {
  async getCompany() {
    const result = await gatewayFetch('/api/v1/account/company', {
      schema: companySchema,
      token: await merchantCredential('shipments'),
    });
    if (!result.ok) return fromGateway(result);
    const { details, kyc_status, documents } = result.data;
    return fromGateway({
      ...result,
      data: {
        details: details && {
          legalName: details.legal_name,
          brandName: details.brand_name,
          gstin: details.gstin,
          pan: details.pan,
          address: details.address,
          bank: { ...details.bank, account: maskAccount(details.bank.account) },
        },
        kycStatus: kycOf(kyc_status),
        documents: documents.map((d) => ({ kind: d.kind as DocumentKind, name: d.name })),
      },
    });
  },

  /** The files are uploaded first, one by one (see uploadDocument); this saves the details. */
  async saveCompany(d) {
    const result = await gatewayFetch('/api/v1/account/company', {
      method: 'PUT',
      schema: z.object({ kyc_status: z.string() }),
      token: await merchantCredential('shipments'),
      body: {
        legal_name: d.legalName,
        brand_name: d.brandName,
        gstin: d.gstin,
        pan: d.pan,
        address: d.address,
        bank: d.bank,
      },
    });
    return fromGateway(result.ok ? { ...result, data: { kycStatus: kycOf(result.data.kyc_status) } } : result);
  },

  async uploadDocument(kind, file) {
    const result = await gatewayFetch(`/api/v1/account/documents/${kind}`, {
      method: 'PUT',
      token: await merchantCredential('shipments'),
      timeoutMs: 30_000,
      body: {
        file_name: file.name,
        content_type: file.type,
        data_base64: Buffer.from(file.bytes).toString('base64'),
      },
    });
    return fromGateway(result.ok ? { ...result, data: null } : result);
  },
};
