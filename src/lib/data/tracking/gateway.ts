import 'server-only';

import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import {
  PublicTrackingSchema,
  TrackingDetailSchema,
  TrackingSchema,
} from '../../gateway/schemas/shipments';
import type { DataResult } from '../source';
import { AWB_NOT_FOUND, type TrackingDetail, type TrackingSummary } from './types';

function trackingPath(awb: string): string {
  return `/api/v1/shipments/${encodeURIComponent(awb)}/tracking`;
}

export async function fetchTracking(
  awb: string,
  token: string | null,
): Promise<DataResult<TrackingSummary>> {
  const result = await gatewayFetch(trackingPath(awb), {
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

/** The full timeline for one shipment, newest event first. */
export async function fetchTimeline(
  awb: string,
  token: string | null,
): Promise<DataResult<TrackingDetail>> {
  const result = await gatewayFetch(trackingPath(awb), {
    schema: TrackingDetailSchema,
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
      timeline: data.timeline
        .map((event) => ({
          status: event.status,
          rawStatus: event.raw_status,
          location: event.location,
          occurredAt: event.occurred_at,
        }))
        .reverse(),
    },
  };
}

/**
 * The timeline for the public tracking page, from the gateway's unauthenticated /api/v1/track
 * route. No token is sent, and the answer never names the courier partner.
 */
export async function fetchTimelinePublic(awb: string): Promise<DataResult<TrackingDetail>> {
  const result = await gatewayFetch(`/api/v1/track/${encodeURIComponent(awb.trim())}`, {
    schema: PublicTrackingSchema,
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
      carrier: '',
      status: data.status,
      rawStatus: null,
      location: located?.location ?? null,
      lastEventAt: data.last_event_at,
      timeline: data.timeline
        .map((event) => ({
          status: event.status,
          rawStatus: null,
          location: event.location,
          occurredAt: event.occurred_at,
        }))
        .reverse(),
    },
  };
}

export const gatewayTrackingService = {
  async lookup(awb: string) {
    return fetchTracking(awb, await merchantCredential('shipments'));
  },
  async getTimeline(awb: string) {
    return fetchTimeline(awb, await merchantCredential('shipments'));
  },
  /** For the public page: never reads a merchant credential. */
  getTimelinePublic(awb: string) {
    return fetchTimelinePublic(awb);
  },
};
