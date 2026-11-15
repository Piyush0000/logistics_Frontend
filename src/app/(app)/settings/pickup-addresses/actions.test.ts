import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { mockPickupAddressService } from '@/lib/data/pickup-addresses/mock';
import {
  deletePickupAddressAction,
  makeDefaultPickupAddressAction,
  savePickupAddressAction,
} from './actions';

const form = {
  label: 'Action test depot',
  name: 'Depot',
  phone: '9822000000',
  line1: '1 Test Road',
  line2: '',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  isDefault: false,
};

async function list() {
  const result = await mockPickupAddressService.list();
  if (!result.ok) throw new Error('list failed');
  return result.data;
}

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
});

describe('signed out', () => {
  it('refuses a signed-out caller on every action', async () => {
    session.current = null;
    const before = (await list()).length;
    const refused = { ok: false, message: 'Sign in again.' };

    expect(await savePickupAddressAction(form)).toEqual(refused);
    expect(await deletePickupAddressAction('pa-002')).toEqual(refused);
    expect(await makeDefaultPickupAddressAction('pa-002')).toEqual(refused);
    expect(await list()).toHaveLength(before);
  });
});

describe('savePickupAddressAction', () => {
  it('rejects bad input without saving', async () => {
    const before = (await list()).length;
    for (const bad of [
      { ...form, label: '   ' },
      { ...form, label: 'x'.repeat(41) },
      { ...form, pincode: '012345' },
      { ...form, phone: '123' },
      null,
    ]) {
      expect((await savePickupAddressAction(bad)).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(await list()).toHaveLength(before);
  });

  it('adds, edits and deletes an address, never touching the default', async () => {
    const defaultBefore = (await list()).find((entry) => entry.isDefault)!.id;

    expect((await savePickupAddressAction(form)).ok).toBe(true);
    const added = (await list()).find((entry) => entry.label === form.label)!;
    expect(added.address.line2).toBeUndefined();

    expect((await savePickupAddressAction({ ...form, id: added.id, city: 'Nashik' })).ok).toBe(true);
    expect((await list()).find((entry) => entry.id === added.id)!.address.city).toBe('Nashik');

    expect((await deletePickupAddressAction(added.id)).ok).toBe(true);
    expect((await list()).find((entry) => entry.isDefault)!.id).toBe(defaultBefore);
  });
});

describe('default handling', () => {
  it('refuses to delete the only default and moves it with make default', async () => {
    const original = (await list()).find((entry) => entry.isDefault)!;
    const refused = await deletePickupAddressAction(original.id);
    expect(refused.ok).toBe(false);

    const other = (await list()).find((entry) => !entry.isDefault)!;
    expect((await makeDefaultPickupAddressAction(other.id)).ok).toBe(true);
    expect((await list()).filter((entry) => entry.isDefault).map((entry) => entry.id)).toEqual([other.id]);
    expect((await makeDefaultPickupAddressAction('pa-missing')).ok).toBe(false);

    expect((await makeDefaultPickupAddressAction(original.id)).ok).toBe(true);
  });

  it('refuses a 26th address', async () => {
    for (let i = (await list()).length; i < 25; i++) {
      await savePickupAddressAction({ ...form, label: `Fill ${i}` });
    }
    const refused = await savePickupAddressAction({ ...form, label: 'One too many' });
    expect(refused.ok).toBe(false);
    expect(await list()).toHaveLength(25);
  });
});
