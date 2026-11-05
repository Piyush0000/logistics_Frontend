import 'server-only';

import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { TrackingSchema } from '../../gateway/schemas/shipments';
import type { DataResult } from '../source';
import { AWB_NOT_FOUND, type TrackingSummary } from './types';

export async function fetchTracking(
  awb: string,
  token: string | null,
): Promise<DataResult<TrackingSummary>> {
  const result = await gatewayFetch(`/api/v1/shipments/${encodeURIComponent(awb)}/tracking`, {
    schema: TrackingSchema,
    token,
  });

  if (!result.ok) {
    const { error } = result;
    return {
      ok: false,
      source: 'gateway',
      error: error.kind === 'not_found' ? { ...error, message: AWB_NOT_FOUND } : error,
    };
  }

  const { data } = result;
  const located = data.timeline.findLast(({ location }) => location);
  return {
    ok: true,
    source: 'gateway',
    data: {
      awb: data.awb,
      carrier: data.carrier,
      status: data.status,
      rawStatus: data.raw_status,
      location: located?.location ?? null,
      lastEventAt: data.last_event_at,
    },
  };
}

export const gatewayTrackingService = {
  async lookup(awb: string) {
    return fetchTracking(awb, await merchantCredential('shipments'));
  },
};
