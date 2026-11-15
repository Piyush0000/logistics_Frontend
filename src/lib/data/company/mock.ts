import 'server-only';

import type { ApiError } from '../../gateway/errors';
import { checkDocuments, maskAccount, parseCompanyInput, DOCUMENT_KINDS } from '../../kyc';
import { fromMock, type DataResult } from '../source';
import type { CompanyDetails, CompanyService, CompanyView, DocumentKind, KycStatus } from './types';

function fail<T>(message: string): DataResult<T> {
  const error: ApiError = { kind: 'validation', status: 400, message };
  return { ok: false, source: 'mock', error };
}

/**
 * Company details that stay in memory. The shared instance below is what the app uses, and the
 * mock Home checklist reads it too; tests make their own. Only the masked account number is
 * ever returned.
 */
export function createMockCompanyService(): CompanyService {
  let details: CompanyDetails | null = null;
  let kycStatus: KycStatus = 'not_started';
  const documents = new Map<DocumentKind, string>();

  const view = (): CompanyView => ({
    details: details && { ...details, address: { ...details.address }, bank: { ...details.bank, account: maskAccount(details.bank.account) } },
    kycStatus,
    documents: DOCUMENT_KINDS.filter(({ kind }) => documents.has(kind)).map(({ kind }) => ({
      kind,
      name: documents.get(kind)!,
    })),
  });

  return {
    async getCompany() {
      return fromMock(view());
    },

    async saveCompany(input, files) {
      // The server action checks this too. It is repeated here so no caller can store bad details.
      const parsed = parseCompanyInput(input);
      if (!parsed.ok) return fail(parsed.message);
      const problem = checkDocuments(files, [...documents.keys()]);
      if (problem) return fail(problem);

      details = parsed.value;
      for (const file of files) documents.set(file.kind, file.name);
      kycStatus = 'submitted';
      return fromMock({ kycStatus });
    },
  };
}

export const mockCompanyService: CompanyService = createMockCompanyService();
