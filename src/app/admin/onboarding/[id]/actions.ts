'use server';

import { revalidatePath } from 'next/cache';
import { adminOnboardingService, type ApplicationStatus } from '@/lib/admin/data/onboarding';
import { requireAdminSession } from '@/lib/admin/session';

export type OnboardingActionResult =
  | { ok: true; message: string; targetStatus: ApplicationStatus }
  | { ok: false; message: string };

export async function decideApplicationAction(
  id: unknown,
  decision: unknown,
  reason?: unknown,
): Promise<OnboardingActionResult> {
  await requireAdminSession();

  if (typeof id !== 'string' || !id.trim()) {
    return { ok: false, message: 'Invalid application identifier.' };
  }

  if (decision !== 'approved' && decision !== 'rejected') {
    return { ok: false, message: 'Invalid decision: must be approved or rejected.' };
  }

  let trimmedReason: string | undefined;
  if (decision === 'rejected') {
    if (typeof reason !== 'string') {
      return { ok: false, message: 'Rejection reason is required.' };
    }
    trimmedReason = reason.trim();
    if (trimmedReason.length < 10 || trimmedReason.length > 500) {
      return { ok: false, message: 'Rejection reason must be between 10 and 500 characters.' };
    }
  }

  const result = await adminOnboardingService().decide(id.trim(), decision, trimmedReason);

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  // TODO(audit): recordAudit({ action: `kyc_${decision}`, target: id, detail: trimmedReason }) once published by Teammate 2

  revalidatePath('/admin');
  revalidatePath('/admin/onboarding');
  revalidatePath(`/admin/onboarding/${id}`);
  revalidatePath('/admin/merchants');
  if (result.data.merchantId) {
    revalidatePath(`/admin/merchants/${result.data.merchantId}`);
  }

  const message =
    decision === 'approved'
      ? 'Application approved successfully. Merchant account is now active.'
      : 'Application rejected.';

  return { ok: true, message, targetStatus: decision };
}

