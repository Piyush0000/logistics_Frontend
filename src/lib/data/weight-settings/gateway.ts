import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import type { PackagePreset, WeightSettingsService } from './types';

const schema = z.object({
  id: z.string(),
  name: z.string(),
  length_cm: z.number(),
  width_cm: z.number(),
  height_cm: z.number(),
  weight_kg: z.number(),
  is_default: z.boolean(),
});
const toPreset = (p: z.infer<typeof schema>): PackagePreset => ({
  id: p.id,
  name: p.name,
  lengthCm: p.length_cm,
  widthCm: p.width_cm,
  heightCm: p.height_cm,
  weightKg: p.weight_kg,
  isDefault: p.is_default,
});
const path = (id?: string) => `/api/v1/settings/presets${id ? `/${encodeURIComponent(id)}` : ''}`;

/** Package presets from /api/v1/settings/presets; one can be the default. */
export const gatewayWeightSettingsService: WeightSettingsService = {
  async listPresets() {
    const result = await gatewayFetch(path(), {
      schema: z.object({ items: z.array(schema) }),
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: result.data.items.map(toPreset) } : result);
  },
  async savePreset(p) {
    const result = await gatewayFetch(path(p.id), {
      method: p.id ? 'PUT' : 'POST',
      schema,
      token: await merchantCredential('shipments'),
      body: {
        name: p.name,
        length_cm: p.lengthCm,
        width_cm: p.widthCm,
        height_cm: p.heightCm,
        weight_kg: p.weightKg,
        is_default: p.isDefault,
      },
    });
    return fromGateway(result.ok ? { ...result, data: toPreset(result.data) } : result);
  },
  async deletePreset(id) {
    const result = await gatewayFetch(path(id), { method: 'DELETE', token: await merchantCredential('shipments') });
    return fromGateway(result.ok ? { ...result, data: null } : result);
  },
};
