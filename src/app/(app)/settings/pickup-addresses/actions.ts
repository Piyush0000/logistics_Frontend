'use server';

import { AddressSchema } from '@logicore/contracts';
import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import { pickupAddressService } from '@/lib/data/pickup-addresses';
import { MAX_LABEL_LENGTH } from '@/lib/data/pickup-addresses/types';
import type { DataResult } from '@/lib/data/source';

export type AddressField =
  | 'label'
  | 'name'
  | 'phone'
  | 'line1'
  | 'line2'
  | 'city'
  | 'state'
  | 'pincode';

export type AddressFieldErrors = Partial<Record<AddressField, string>>;

export type AddressActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: AddressFieldErrors };

const SIGN_IN_AGAIN = 'Sign in again.';
const ROUTE = '/settings/pickup-addresses';

const FIELD_MESSAGES: Record<AddressField, string> = {
  label: `Label must be 1 to ${MAX_LABEL_LENGTH} characters.`,
  name: 'Enter a contact name of up to 120 characters.',
  phone: 'Enter 10 to 15 digits, with an optional + at the start.',
  line1: 'Enter address line 1 of up to 200 characters.',
  line2: 'Address line 2 must be at most 200 characters.',
  city: 'Enter a city of up to 100 characters.',
  state: 'Enter a state of up to 100 characters.',
  pincode: 'Indian pincodes must be 6 digits and not start with 0.',
};

function failure(result: Extract<DataResult<unknown>, { ok: false }>): AddressActionResult {
  return {
    ok: false,
    message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message,
  };
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// Server actions can be called directly, so each one checks the session and the input itself.
export async function savePickupAddressAction(input: unknown): Promise<AddressActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const label = text(raw.label);
  const line2 = text(raw.line2);
  const address = AddressSchema.safeParse({
    name: text(raw.name),
    phone: text(raw.phone),
    line1: text(raw.line1),
    ...(line2 ? { line2 } : {}),
    city: text(raw.city),
    state: text(raw.state),
    country: 'IN',
    pincode: text(raw.pincode),
  });

  const errors: AddressFieldErrors = {};
  if (label.length < 1 || label.length > MAX_LABEL_LENGTH) errors.label = FIELD_MESSAGES.label;
  if (!address.success) {
    for (const issue of address.error.issues) {
      const field = issue.path[0] as AddressField | undefined;
      if (field && field in FIELD_MESSAGES) errors[field] = FIELD_MESSAGES[field];
    }
  }
  if (Object.keys(errors).length > 0 || !address.success) {
    return { ok: false, message: 'Check the highlighted fields, then try again.', errors };
  }

  const id = typeof raw.id === 'string' && raw.id ? raw.id : undefined;
  const result = await pickupAddressService().save({
    ...(id ? { id } : {}),
    label,
    address: address.data,
    isDefault: raw.isDefault === true,
  });
  if (!result.ok) return failure(result);
  revalidatePath(ROUTE);
  return { ok: true, message: id ? 'Address saved.' : 'Address added.' };
}

export async function deletePickupAddressAction(id: unknown): Promise<AddressActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  if (typeof id !== 'string' || !id) return { ok: false, message: 'This address could not be found.' };

  const result = await pickupAddressService().remove(id);
  if (!result.ok) return failure(result);
  revalidatePath(ROUTE);
  return { ok: true, message: 'Address deleted.' };
}

export async function makeDefaultPickupAddressAction(id: unknown): Promise<AddressActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  if (typeof id !== 'string' || !id) return { ok: false, message: 'This address could not be found.' };

  const result = await pickupAddressService().makeDefault(id);
  if (!result.ok) return failure(result);
  revalidatePath(ROUTE);
  return { ok: true, message: 'Default address changed.' };
}
