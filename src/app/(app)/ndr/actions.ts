'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDemoSession } from '@/lib/auth/session';
import { ndrService } from '@/lib/data/ndr';

export interface NdrFormState {
  ok: boolean;
  message?: string;
}

export async function submitNdrAction(
  _prevState: NdrFormState,
  formData: FormData,
): Promise<NdrFormState> {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const ndr_id = formData.get('ndr_id') as string;
  const action = formData.get('action') as 'REATTEMPT' | 'RTO';
  const instructions = (formData.get('instructions') as string) || undefined;
  const preferred_date = (formData.get('preferred_date') as string) || undefined;

  if (!ndr_id || !action) {
    return { ok: false, message: 'Invalid action parameters' };
  }

  const result = await ndrService().takeNdrAction({
    ndr_id,
    action,
    instructions,
    preferred_date,
  });

  if (!result.ok) {
    return { ok: false, message: result.error.message || 'Action failed' };
  }

  revalidatePath('/ndr');
  return { ok: true, message: `Successfully requested ${action === 'REATTEMPT' ? 'Reattempt' : 'Return to Origin'}` };
}

