import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import type { TrackingPageBranding, TrackingPageService } from './types';

const schema = z.object({
  display_name: z.string(),
  support_email: z.string(),
  support_phone: z.string(),
  accent: z.enum(['primary', 'accent', 'success']),
  show_courier: z.boolean(),
  logo_name: z.string().nullable(),
});
const toBranding = (b: z.infer<typeof schema>): TrackingPageBranding => ({
  displayName: b.display_name,
  supportEmail: b.support_email,
  supportPhone: b.support_phone,
  accent: b.accent,
  showCourier: b.show_courier,
  logoName: b.logo_name,
});

/** Tracking page branding from /api/v1/settings/tracking-page; the public page shows it. */
export const gatewayTrackingPageService: TrackingPageService = {
  async get() {
    const result = await gatewayFetch('/api/v1/settings/tracking-page', {
      schema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: toBranding(result.data) } : result);
  },
  async save(b) {
    const result = await gatewayFetch('/api/v1/settings/tracking-page', {
      method: 'PUT',
      schema,
      token: await merchantCredential('shipments'),
      body: {
        display_name: b.displayName,
        support_email: b.supportEmail,
        support_phone: b.supportPhone,
        accent: b.accent,
        show_courier: b.showCourier,
        logo_name: b.logoName,
      },
    });
    return fromGateway(result.ok ? { ...result, data: toBranding(result.data) } : result);
  },
};
