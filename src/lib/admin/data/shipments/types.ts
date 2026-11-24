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

export interface ShipmentTimelineEvent {
  status: string;
  rawStatus?: string;
  location?: string | null;
  occurredAt: string;
}

export interface AdminShipmentDetail extends AdminShipment {
  origin: string;
  destination: string;
  recipientName: string;
  recipientPhone: string;
  weightGrams: number;
  codAmountPaise?: number;
  timeline: ShipmentTimelineEvent[];
}

export interface AdminNdrShipment extends AdminShipment {
  ndrReason: string;
  attemptsCount: number;
  lastAttemptAt: string;
  actionRequired: string;
}

export interface AdminRtoShipment extends AdminShipment {
  rtoReason: string;
  rtoInitiatedAt: string;
  rtoDeliveredAt?: string | null;
}

export interface AdminShipmentQuery {
  q?: string;
  status?: string;
  merchantId?: string;
  stuck?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdminShipmentsService {
  listShipments(query: AdminShipmentQuery): Promise<DataResult<Page<AdminShipment>>>;
  getShipment(awb: string): Promise<DataResult<AdminShipmentDetail>>;
  listNdrShipments(query?: { q?: string; page?: number }): Promise<DataResult<Page<AdminNdrShipment>>>;
  listRtoShipments(query?: { q?: string; page?: number }): Promise<DataResult<Page<AdminRtoShipment>>>;
  /** Gives back what a cancelled shipment held or was charged; once only. */
  refundCancelled(awb: string): Promise<DataResult<RefundResult>>;
}

export interface RefundResult {
  refunded: boolean;
  amountPaise: number | null;
  /** Why nothing was refunded, when nothing was. */
  reason: string | null;
}
