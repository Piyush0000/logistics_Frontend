import { beforeEach, describe, expect, it } from 'vitest';
import { adminMerchantsService, resetMockMerchants } from '../merchants';
import { adminOnboardingService, resetMockApplications } from './index';

describe('adminOnboardingService mock implementation', () => {
  beforeEach(() => {
    resetMockApplications();
    resetMockMerchants();
  });

  it('lists all applications and filters by status', async () => {
    const service = adminOnboardingService();

    const all = await service.listApplications();
    expect(all.ok).toBe(true);
    if (!all.ok) return;
    expect(all.data.length).toBeGreaterThanOrEqual(4);

    const pending = await service.listApplications('pending');
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    expect(pending.data.every((app) => app.status === 'pending')).toBe(true);
    expect(pending.data.length).toBe(2);

    const approved = await service.listApplications('approved');
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.data.every((app) => app.status === 'approved')).toBe(true);

    const rejected = await service.listApplications('rejected');
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.data.every((app) => app.status === 'rejected')).toBe(true);
  });

  it('retrieves an application by ID or merchantId', async () => {
    const service = adminOnboardingService();

    const byAppId = await service.getApplication('app_mer_006');
    expect(byAppId.ok).toBe(true);
    if (byAppId.ok) {
      expect(byAppId.data.businessName).toBe('Coastal Crafts Co.');
      expect(byAppId.data.documents.length).toBe(3);
    }

    const byMerchantId = await service.getApplication('mer_006');
    expect(byMerchantId.ok).toBe(true);
    if (byMerchantId.ok) {
      expect(byMerchantId.data.id).toBe('app_mer_006');
    }

    const missing = await service.getApplication('app_unknown_999');
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.error.kind).toBe('not_found');
    }
  });

  it('approves a pending application and activates the merchant', async () => {
    const service = adminOnboardingService();
    const merchantsService = adminMerchantsService();

    // coastal crafts mer_006
    const res = await service.decide('app_mer_006', 'approved');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe('approved');

    // Verify merchant was updated
    const merchant = await merchantsService.getMerchant('mer_006');
    expect(merchant.ok).toBe(true);
    if (merchant.ok) {
      expect(merchant.data.kyc).toBe('approved');
      expect(merchant.data.status).toBe('active');
    }
  });

  it('rejects a pending application with valid reason', async () => {
    const service = adminOnboardingService();
    const merchantsService = adminMerchantsService();

    const reason = 'GST certificate was blurry and expired on 2025-10-01.';
    const res = await service.decide('app_mer_006', 'rejected', reason);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe('rejected');
    expect(res.data.rejectionReason).toBe(reason);

    // Verify merchant KYC status is rejected
    const merchant = await merchantsService.getMerchant('mer_006');
    expect(merchant.ok).toBe(true);
    if (merchant.ok) {
      expect(merchant.data.kyc).toBe('rejected');
    }
  });

  it('validates rejection reason length', async () => {
    const service = adminOnboardingService();

    // Too short (< 10 chars)
    const tooShort = await service.decide('app_mer_006', 'rejected', 'Too short');
    expect(tooShort.ok).toBe(false);
    if (!tooShort.ok) {
      expect(tooShort.error.kind).toBe('validation');
      expect(tooShort.error.message).toContain('between 10 and 500 characters');
    }

    // Too long (> 500 chars)
    const tooLong = await service.decide('app_mer_006', 'rejected', 'A'.repeat(501));
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) {
      expect(tooLong.error.kind).toBe('validation');
      expect(tooLong.error.message).toContain('between 10 and 500 characters');
    }
  });

  it('prevents deciding an already decided application twice', async () => {
    const service = adminOnboardingService();

    // Already approved application app_mer_005
    const alreadyApproved = await service.decide('app_mer_005', 'approved');
    expect(alreadyApproved.ok).toBe(false);
    if (!alreadyApproved.ok) {
      expect(alreadyApproved.error.kind).toBe('validation');
      expect(alreadyApproved.error.message).toBe('This application has already been decided.');
    }

    // Approve app_mer_006 then try to reject it
    const approve = await service.decide('app_mer_006', 'approved');
    expect(approve.ok).toBe(true);

    const secondDecision = await service.decide('app_mer_006', 'rejected', 'Some reason here for rejecting.');
    expect(secondDecision.ok).toBe(false);
    if (!secondDecision.ok) {
      expect(secondDecision.error.message).toBe('This application has already been decided.');
    }
  });
});
