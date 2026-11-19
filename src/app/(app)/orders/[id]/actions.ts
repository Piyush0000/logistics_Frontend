'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDemoSession } from '@/lib/auth/session';
import { ordersService } from '@/lib/data/orders';

export interface CancelState {
  status: 'idle' | 'requested' | 'cancelled' | 'error';
  message?: string;
}

/** Asks the courier to cancel. The courier confirms within a minute or two. */
export async function cancelShipmentAction(
  _state: CancelState,
  formData: FormData,
): Promise<CancelState> {
  if (!(await getDemoSession())) redirect('/login');

  const id = formData.get('id');
  if (typeof id !== 'string' || !id) return { status: 'error', message: 'Missing shipment.' };
  const reason = formData.get('reason');

  const result = await ordersService().cancelShipment(
    id,
    typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 200) : undefined,
  );
  if (!result.ok) return { status: 'error', message: result.error.message };

  revalidatePath(`/orders/${id}`);
  return result.data.status === 'CANCELLED'
    ? { status: 'cancelled', message: 'The shipment is cancelled.' }
    : {
        status: 'requested',
        message: 'Cancellation sent to the courier. It usually confirms within a few minutes.',
      };
}
