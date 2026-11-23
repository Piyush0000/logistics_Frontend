import type { TrackingDetail } from '@/lib/data/tracking';

/** The longest AWB the page will look up. Anything longer cannot be a real AWB. */
export const AWB_MAX_LENGTH = 40;

export const PUBLIC_STAGES = ['Manifested', 'In transit', 'Out for delivery', 'Delivered'] as const;

export type StageProgress =
  | { kind: 'progress'; /** Index into PUBLIC_STAGES of the stage reached, or -1 before the first. */ current: number }
  | { kind: 'stopped'; message: string };

const STAGE_BY_STATUS: Record<string, number> = {
  MANIFESTED: 0,
  IN_TRANSIT: 1,
  OUT_FOR_DELIVERY: 2,
  DELIVERED: 3,
};

const STOPPED_BY_STATUS: Record<string, string> = {
  RTO_INITIATED: 'Returning to the sender. This shipment will not be delivered to you.',
  RTO_DELIVERED: 'Returned to the sender. This shipment was not delivered to you.',
  CANCELLED: 'Cancelled. This shipment is no longer on its way.',
  FAILED: 'Delivery failed. Please contact the sender for next steps.',
};

/** Statuses before MANIFESTED, and any status not known yet, reach no stage. */
export function stageProgress(status: string): StageProgress {
  const stopped = STOPPED_BY_STATUS[status];
  if (stopped) return { kind: 'stopped', message: stopped };
  return { kind: 'progress', current: STAGE_BY_STATUS[status] ?? -1 };
}

export interface PublicEvent {
  status: string;
  location: string | null;
  occurredAt: string;
}

/** Everything the public page may show. Add a field here only if a buyer should see it. */
export interface PublicView {
  awb: string;
  carrier: string;
  status: string;
  progress: StageProgress;
  timeline: PublicEvent[];
  branding: { displayName: string; supportEmail: string; supportPhone: string } | null;
}

/** Picks each field by name. Never spread `detail`: new fields on it must not reach buyers. */
export function toPublicView(detail: TrackingDetail): PublicView {
  return {
    awb: detail.awb,
    carrier: detail.carrier,
    status: detail.status,
    progress: stageProgress(detail.status),
    timeline: detail.timeline.map((event) => ({
      status: event.status,
      location: event.location,
      occurredAt: event.occurredAt,
    })),
    branding: detail.branding
      ? {
          displayName: detail.branding.displayName,
          supportEmail: detail.branding.supportEmail,
          supportPhone: detail.branding.supportPhone,
        }
      : null,
  };
}

/** The AWB from the URL is user input: decode it safely, trim it and cap its length. */
export function parsePublicAwb(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const awb = decoded.trim();
  return awb.length > 0 && awb.length <= AWB_MAX_LENGTH ? awb : null;
}
