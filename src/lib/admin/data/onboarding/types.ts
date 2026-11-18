import type { DataResult } from '../../../data/source';

export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type DocumentKind = 'gst_certificate' | 'pan_card' | 'cancelled_cheque';

export interface ApplicationDocument {
  kind: DocumentKind;
  fileName: string;
  /** Size in bytes. The frontend never stores file contents. */
  size: number;
}

/** A merchant waiting to be approved, with their KYC details. */
export interface OnboardingApplication {
  id: string;
  merchantId: string;
  businessName: string;
  email: string;
  city: string;
  gstin: string | null;
  pan: string | null;
  /** ISO timestamp. */
  submittedAt: string;
  status: ApplicationStatus;
  documents: ApplicationDocument[];
  /** Set when rejected. */
  rejectionReason?: string;
}

export interface AdminOnboardingService {
  listApplications(status?: ApplicationStatus): Promise<DataResult<OnboardingApplication[]>>;
  getApplication(id: string): Promise<DataResult<OnboardingApplication>>;
  decide(
    id: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): Promise<DataResult<OnboardingApplication>>;
}
