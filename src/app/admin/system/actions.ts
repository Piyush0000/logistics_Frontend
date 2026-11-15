'use server';

import { revalidatePath } from 'next/cache';
import { adminSystemService, recordAudit } from '@/lib/admin/data/system';
import { requireAdminSession } from '@/lib/admin/session';

export type RetryState = { status: 'idle' } | { status: 'error'; message: string } | { status: 'queued'; message: string };

/** Mirrors the webhooks service's retry route, then audits it. */
export async function retryWebhookAction(_previous: RetryState, form: FormData): Promise<RetryState> {
  await requireAdminSession();
  const id = String(form.get('id') ?? '').slice(0, 100);
  const result = await adminSystemService().retryWebhookDelivery(id);
  if (!result.ok) {
    return { status: 'error', message: result.error.kind === 'not_found' ? 'That delivery does not exist.' : result.error.message };
  }

  const delivery = result.data;
  await recordAudit({
    action: 'Webhook retried',
    target: `${delivery.merchantId} · ${delivery.merchantName}`,
    detail: `${delivery.topic} delivery ${delivery.id} queued to be sent again after ${delivery.attempts} failed attempts.`,
  });
  revalidatePath('/admin/system');
  return { status: 'queued', message: 'Queued. It goes out with the next send.' };
}
