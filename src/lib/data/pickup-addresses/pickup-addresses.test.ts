import { AddressSchema } from '@logicore/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gatewayPickupAddressService } from './gateway';
import { pickupAddressService } from './index';
import { mockPickupAddressService as mock } from './mock';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));
afterEach(() => vi.unstubAllGlobals());

const address = {
  name: 'Depot',
  phone: '9822000000',
  line1: '1 Test Road',
  city: 'Pune',
  state: 'Maharashtra',
  country: 'IN',
  pincode: '411001',
};

async function all() {
  const result = await mock.list();
  if (!result.ok) throw new Error('list failed');
  return result.data;
}

describe('mock pickup addresses', () => {
  it('lists two valid sample addresses with exactly one default', async () => {
    const list = await all();
    expect(list).toHaveLength(2);
    expect(list.filter((entry) => entry.isDefault)).toHaveLength(1);
    for (const entry of list) expect(AddressSchema.safeParse(entry.address).success).toBe(true);
  });

  it('refuses to delete the default while others exist', async () => {
    const list = await all();
    const result = await mock.remove(list.find((entry) => entry.isDefault)!.id);
    expect(result.ok).toBe(false);
    expect(await all()).toHaveLength(2);
  });

  it('rejects a bad label or address', async () => {
    for (const label of ['', '   ', 'x'.repeat(41)]) {
      expect((await mock.save({ label, address, isDefault: false })).ok).toBe(false);
    }
    const bad = { ...address, pincode: '012345' };
    expect((await mock.save({ label: 'Bad', address: bad, isDefault: false })).ok).toBe(false);
  });

  it('moves the default when another address is made default, then allows deleting the old one', async () => {
    const saved = await mock.save({ label: 'Pune depot', address, isDefault: true });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const list = await all();
    expect(list.filter((entry) => entry.isDefault).map((entry) => entry.id)).toEqual([saved.data.id]);
    expect((await mock.remove('pa-001')).ok).toBe(true);
    expect((await mock.remove(saved.data.id)).ok).toBe(false);
  });

  it('makeDefault moves the default in one step, and refuses a missing id', async () => {
    const before = await all();
    const target = before.find((entry) => !entry.isDefault)!;
    const result = await mock.makeDefault(target.id);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe(target.id);
    expect((await all()).filter((entry) => entry.isDefault).map((entry) => entry.id)).toEqual([target.id]);
    // Making the current default the default again changes nothing.
    expect((await mock.makeDefault(target.id)).ok).toBe(true);
    const missing = await mock.makeDefault('pa-missing');
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.error.kind).toBe('not_found');
    expect((await all()).filter((entry) => entry.isDefault)).toHaveLength(1);
  });

  it('refuses a 26th address and keeps one default', async () => {
    let list = await all();
    for (let i = list.length; i < 25; i++) {
      expect((await mock.save({ label: `Extra ${i}`, address, isDefault: false })).ok).toBe(true);
    }
    const refused = await mock.save({ label: 'One too many', address, isDefault: false });
    expect(refused.ok).toBe(false);
    list = await all();
    expect(list).toHaveLength(25);
    expect(list.filter((entry) => entry.isDefault)).toHaveLength(1);
  });
});

describe('gateway pickup addresses', () => {
  it('lists, adds, edits, removes and sets the default through the account API', async () => {
    const stub = (body: unknown, status = 200) => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      status === 204 ? new Response(null, { status }) : Response.json(body, { status }),
    );
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };
    const row = { id: 'a1', label: 'Depot', address, is_default: true };
    let fetchMock = stub({ items: [row] });
    expect(await gatewayPickupAddressService.list()).toMatchObject({
      ok: true,
      data: [{ id: 'a1', label: 'Depot', isDefault: true }],
    });
    fetchMock = stub(row);
    await gatewayPickupAddressService.save({ label: 'Depot', address, isDefault: true });
    await gatewayPickupAddressService.save({ id: 'a1', label: 'Depot', address, isDefault: false });
    await gatewayPickupAddressService.makeDefault('a1');
    const calls = fetchMock.mock.calls.map(([url, init]) => [init?.method, new URL(String(url)).pathname]);
    expect(calls).toEqual([
      ['POST', '/api/v1/account/pickup-addresses'],
      ['PUT', '/api/v1/account/pickup-addresses/a1'],
      ['POST', '/api/v1/account/pickup-addresses/a1/default'],
    ]);
    stub(null, 204);
    expect(await gatewayPickupAddressService.remove('a1')).toMatchObject({ ok: true, data: null });
  });

  it('picks the source from DATA_SOURCE_PICKUP_ADDRESSES', () => {
    expect(pickupAddressService()).toBe(mock);
    process.env.DATA_SOURCE_PICKUP_ADDRESSES = 'gateway';
    try {
      expect(pickupAddressService()).toBe(gatewayPickupAddressService);
    } finally {
      delete process.env.DATA_SOURCE_PICKUP_ADDRESSES;
    }
  });
});
