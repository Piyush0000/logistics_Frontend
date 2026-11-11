import type { CompanyDetails, DocumentFile, DocumentKind, KycStatus } from '../../kyc';
import type { DataResult } from '../source';

export type { CompanyDetails, DocumentFile, DocumentKind, KycStatus };

export interface CompanyView {
  /** The saved details, with the account number masked to its last 4 digits. Null before the first save. */
  details: CompanyDetails | null;
  kycStatus: KycStatus;
  documents: { kind: DocumentKind; name: string }[];
}

export interface CompanyService {
  getCompany(): Promise<DataResult<CompanyView>>;
  saveCompany(d: CompanyDetails, documents: DocumentFile[]): Promise<DataResult<{ kycStatus: KycStatus }>>;
}
