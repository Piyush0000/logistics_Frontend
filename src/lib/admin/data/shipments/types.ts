import type { Page } from '../common';
import type { DataResult } from '../../../data/source';

/** A shipment from any merchant. */
export interface AdminShipment {
  awb: string;
  merchantId: string;
  merchantName: string;
  carrier: string;
  /** The backend's normalised status, e.g. IN_TRANSIT. */
  status: string;
  /** ISO timestamps. */
  createdAt: string;
  lastEventAt: string;
  /** No tracking update for longer than the courier's usual gap. */
  stuck: boolean;
}

export interface AdminShipmentQuery {
  q?: string;
  status?: string;
  merchantId?: string;
  stuck?: boolean;
  page?: number;
}

export interface AdminShipmentsService {
  listShipments(query: AdminShipmentQuery): Promise<DataResult<Page<AdminShipment>>>;
  // Planned (Teammate 1): getShipment(awb) with its timeline; NDR and RTO views across merchants.
}
