import 'server-only';

import { AddressSchema } from '@logicore/contracts';
import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import type { PickupAddress, PickupAddressService } from './types';

const rowSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: AddressSchema,
  is_default: z.boolean(),
});

const toAddress = (row: z.infer<typeof rowSchema>): PickupAddress => ({
  id: row.id,
  label: row.label,
  address: row.address,
  isDefault: row.is_default,
});

const path = (id?: string) =>
  `/api/v1/account/pickup-addresses${id ? `/${encodeURIComponent(id)}` : ''}`;

/** Saved pickup addresses from /api/v1/account/pickup-addresses; one is the default. */
export const gatewayPickupAddressService: PickupAddressService = {
  async list() {
    const result = await gatewayFetch(path(), {
      schema: z.object({ items: z.array(rowSchema) }),
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: result.data.items.map(toAddress) } : result);
  },

  async save({ id, label, address, isDefault }) {
    const result = await gatewayFetch(path(id), {
      method: id ? 'PUT' : 'POST',
      schema: rowSchema,
      token: await merchantCredential('shipments'),
      body: { label, address, is_default: isDefault },
    });
    return fromGateway(result.ok ? { ...result, data: toAddress(result.data) } : result);
  },

  async remove(id) {
    const result = await gatewayFetch(path(id), {
      method: 'DELETE',
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: null } : result);
  },

  async makeDefault(id) {
    const result = await gatewayFetch(`${path(id)}/default`, {
      method: 'POST',
      schema: rowSchema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: toAddress(result.data) } : result);
  },
};
