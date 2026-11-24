'use server';

import { revalidatePath } from 'next/cache';
import { adminShipmentsService } from '@/lib/admin/data/shipments';
import { recordAudit } from '@/lib/admin/data/system';
import { requireAdminSession } from '@/lib/admin/session';
import { formatPaise } from '@/lib/format/money';

export type RefundState = { status: 'idle' } | { status: 'done' | 'failed'; message: string };

/** Gives back what a cancelled shipment held or was charged, then audits it. */
export async function refundCancelledAction(_previous: RefundState, form: FormData): Promise<RefundState> {
  await requireAdminSession();
  const awb = String(form.get('awb') ?? '').slice(0, 64);
  const result = await adminShipmentsService().refundCancelled(awb);
  if (!result.ok) return { status: 'failed', message: result.error.message };
  if (!result.data.refunded) {
    return { status: 'done', message: `Nothing to give back: ${result.data.reason ?? 'already settled'}.` };
  }
  const amount = formatPaise(result.data.amountPaise ?? 0);
  await recordAudit({
    action: 'Cancelled shipment refunded',
    target: awb,
    detail: `${amount} given back to the merchant's wallet.`,
  });
  revalidatePath(`/admin/shipments/${awb}`);
  return { status: 'done', message: `${amount} given back to the merchant's wallet.` };
}
