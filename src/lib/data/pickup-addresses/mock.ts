import { AddressSchema } from '@logicore/contracts';
import type { ApiError } from '../../gateway/errors';
import { fromMock, type DataResult } from '../source';
import {
  MAX_LABEL_LENGTH,
  MAX_PICKUP_ADDRESSES,
  type PickupAddress,
  type PickupAddressService,
} from './types';

let store: PickupAddress[] = [
  {
    id: 'pa-001',
    label: 'Bengaluru warehouse',
    isDefault: true,
    address: {
      name: 'Central Hub',
      phone: '9876543210',
      line1: 'Plot 42, Electronic City',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'IN',
      pincode: '560100',
    },
  },
  {
    id: 'pa-002',
    label: 'Gurugram store',
    isDefault: false,
    address: {
      name: 'North Store',
      phone: '9811000111',
      line1: '12, Sector 29 Market',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'IN',
      pincode: '122001',
    },
  },
];
let nextId = 3;

function fail<T>(kind: ApiError['kind'], message: string, status = 400): DataResult<T> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

export const mockPickupAddressService: PickupAddressService = {
  async list() {
    return fromMock(store.map((entry) => ({ ...entry })));
  },

  async save(input) {
    const label = input.label.trim();
    if (label.length < 1 || label.length > MAX_LABEL_LENGTH) {
      return fail('validation', `Label must be 1 to ${MAX_LABEL_LENGTH} characters.`);
    }
    const address = AddressSchema.safeParse(input.address);
    if (!address.success) {
      return fail('validation', address.error.issues[0]?.message ?? 'Check the address.');
    }

    const existing = input.id ? store.find((entry) => entry.id === input.id) : undefined;
    if (input.id && !existing) return fail('not_found', 'This address could not be found.', 404);
    if (!existing && store.length >= MAX_PICKUP_ADDRESSES) {
      return fail('conflict', `You can save at most ${MAX_PICKUP_ADDRESSES} addresses.`, 409);
    }

    // There is always exactly one default. The first address is it, and the default is only
    // switched off by choosing another one.
    const otherDefault = store.some((entry) => entry.isDefault && entry.id !== existing?.id);
    const isDefault = input.isDefault || !otherDefault;

    const saved: PickupAddress = {
      id: existing?.id ?? `pa-${String(nextId++).padStart(3, '0')}`,
      label,
      address: address.data,
      isDefault,
    };
    store = existing
      ? store.map((entry) => (entry.id === saved.id ? saved : entry))
      : [...store, saved];
    if (isDefault) {
      store = store.map((entry) => (entry.id === saved.id ? entry : { ...entry, isDefault: false }));
    }
    return fromMock({ ...saved });
  },

  // One synchronous step, so two people choosing a default at once can never leave two defaults.
  async makeDefault(id) {
    const target = store.find((entry) => entry.id === id);
    if (!target) return fail('not_found', 'This address could not be found.', 404);
    store = store.map((entry) => ({ ...entry, isDefault: entry.id === id }));
    return fromMock({ ...target, isDefault: true });
  },

  async remove(id) {
    const target = store.find((entry) => entry.id === id);
    if (!target) return fail('not_found', 'This address could not be found.', 404);
    if (target.isDefault && store.length > 1) {
      return fail('conflict', 'Choose another default address before deleting this one.', 409);
    }
    store = store.filter((entry) => entry.id !== id);
    return fromMock(null);
  },
};
