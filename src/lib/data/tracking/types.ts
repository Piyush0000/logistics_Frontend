export interface TrackingSummary {
  awb: string;
  carrier: string;
  status: string;
  rawStatus: string | null;
  location: string | null;
  lastEventAt: string | null;
}

export const AWB_NOT_FOUND = 'No shipment found for this AWB.';
