'use server';

import { revalidatePath } from 'next/cache';
import { adminMerchantsService, MERCHANT_STATUSES, type MerchantStatus } from '@/lib/admin/data/merchants';
import { requireAdminSession } from '@/lib/admin/session';

export type MerchantStatusActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function updateMerchantStatusAction(
  id: unknown,
  status: unknown,
  reason: unknown,
): Promise<MerchantStatusActionResult> {
  await requireAdminSession();

  if (typeof id !== 'string' || !id.trim()) {
    return { ok: false, message: 'Invalid merchant identifier.' };
  }

  if (typeof status !== 'string' || !(MERCHANT_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, message: 'Invalid merchant status.' };
  }

  if (typeof reason !== 'string') {
    return { ok: false, message: 'Reason must be text.' };
  }

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 5 || trimmedReason.length > 300) {
    return { ok: false, message: 'Reason must be between 5 and 300 characters.' };
  }

  const result = await adminMerchantsService().setMerchantStatus(
    id.trim(),
    status as MerchantStatus,
    trimmedReason,
  );

  if (!result.ok) {
    return { ok: false, message: result.error.message };
  }

  // TODO(audit): recordAudit({ action: `merchant_${status}`, target: id, detail: trimmedReason }) once published by Teammate 2

  revalidatePath('/admin/merchants');
  revalidatePath(`/admin/merchants/${id}`);

  const label = status === 'suspended' ? 'Merchant suspended.' : 'Merchant status updated.';
  return { ok: true, message: label };
}

