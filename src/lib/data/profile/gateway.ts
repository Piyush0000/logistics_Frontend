import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import type { ProfileService } from './types';

const profileSchema = z.object({ name: z.string(), email: z.string(), phone: z.string() });

/** The signed-in person's profile and password, from /api/v1/account. */
export const gatewayProfileService: ProfileService = {
  async getProfile() {
    return fromGateway(
      await gatewayFetch('/api/v1/account/profile', {
        schema: profileSchema,
        token: await merchantCredential('shipments'),
      }),
    );
  },

  async updateProfile({ name, phone }) {
    return fromGateway(
      await gatewayFetch('/api/v1/account/profile', {
        method: 'PATCH',
        schema: profileSchema,
        token: await merchantCredential('shipments'),
        body: { name, phone },
      }),
    );
  },

  async changePassword(current, next) {
    const result = await gatewayFetch('/api/v1/account/password', {
      method: 'POST',
      token: await merchantCredential('shipments'),
      body: { current, next },
    });
    return fromGateway(result.ok ? { ...result, data: null } : result);
  },
};
