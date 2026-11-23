export interface TrackingSummary {
  awb: string;
  carrier: string;
  status: string;
  rawStatus: string | null;
  location: string | null;
  lastEventAt: string | null;
}

export const AWB_NOT_FOUND = 'No shipment found for this AWB.';

export interface TrackingEvent {
  status: string;
  rawStatus: string | null;
  location: string | null;
  occurredAt: string;
}

/** The timeline runs newest first. */
/** The merchant's own name and support contacts, shown to their customer. */
export interface TrackingBranding {
  displayName: string;
  supportEmail: string;
  supportPhone: string;
}

export interface TrackingDetail extends TrackingSummary {
  timeline: TrackingEvent[];
  /** Public page only: what the merchant chose to show. */
  branding?: TrackingBranding | null;
}
