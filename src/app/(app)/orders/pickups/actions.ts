'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import { pickupAddressService } from '@/lib/data/pickup-addresses';
import { pickupsService } from '@/lib/data/pickups';
import { parsePickupInput } from '@/lib/data/pickups/input';

export type SchedulePickupResult =
  | { ok: true; pickupId: string }
  | { ok: false; message: string };

// Server actions can be called directly, so this one checks the session itself.
export async function schedulePickupAction(input: unknown): Promise<SchedulePickupResult> {
  if (!(await getDemoSession())) return { ok: false, message: 'Sign in again.' };

  const parsed = parsePickupInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const addresses = await pickupAddressService().list();
  if (!addresses.ok) {
    return { ok: false, message: 'Saved pickup addresses are not available yet. Try again later.' };
  }
  if (!addresses.data.some((entry) => entry.id === parsed.data.pickupAddressId)) {
    return { ok: false, message: 'Choose one of your saved pickup addresses.' };
  }

  const result = await pickupsService().schedulePickup(parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.kind === 'unauthorized' ? 'Sign in again.' : result.error.message,
    };
  }

  revalidatePath('/orders/pickups');
  return { ok: true, pickupId: result.data.id };
}
