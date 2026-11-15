'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import { b2bService, type B2bFieldErrors } from '@/lib/data/b2b';
import { parseB2bInput } from '@/lib/data/b2b/input';
import { pickupAddressService } from '@/lib/data/pickup-addresses';

export type CreateB2bResult =
  | { ok: true; lrNumber: string }
  | { ok: false; message: string; fieldErrors?: B2bFieldErrors };

// Server actions can be called directly, so this one checks the session itself.
export async function createB2bShipmentAction(input: unknown): Promise<CreateB2bResult> {
  if (!(await getDemoSession())) return { ok: false, message: 'Sign in again.' };

  const parsed = parseB2bInput(input);
  if (!parsed.ok) {
    return { ok: false, message: 'Some fields need attention.', fieldErrors: parsed.fieldErrors };
  }

  const addresses = await pickupAddressService().list();
  if (!addresses.ok) {
    return { ok: false, message: 'Saved pickup addresses are not available yet. Try again later.' };
  }
  if (!addresses.data.some((entry) => entry.id === parsed.data.pickupAddressId)) {
    return {
      ok: false,
      message: 'Some fields need attention.',
      fieldErrors: { pickupAddressId: 'Choose one of your saved pickup addresses.' },
    };
  }

  const result = await b2bService().createShipment(parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.error.kind === 'unauthorized' ? 'Sign in again.' : result.error.message,
    };
  }

  revalidatePath('/orders/b2b');
  return { ok: true, lrNumber: result.data.lrNumber };
}
