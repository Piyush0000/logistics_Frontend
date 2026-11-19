import type {
  Address,
  CarrierName,
  Dimensions,
  NormalizedStatus,
  PaymentType,
  ShipmentItem,
  StandardShipmentRequestInput,
} from '@logicore/contracts';
import type { DataResult } from '../source';

export interface OrderSummary {
  shipment_id: string;
  reference_id: string;
  carrier: string;
  awb: string;
  status: string;
  created_at: string;
  last_status_at: string;
  stuck: boolean;
  /** The courier's own wording for the status. The gateway list route does not send it. */
  raw_status?: string | null;
}

export interface OrderListQuery {
  status?: string;
  carrier?: string;
  from?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrderListResult {
  items: OrderSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface TimelineEvent {
  status: string;
  location: string | null;
  timestamp: string;
  description: string;
}

export interface OrderDetail extends OrderSummary {
  origin: Address;
  destination: Address;
  weight_kg: number;
  dimensions: Dimensions;
  items: ShipmentItem[];
  payment_type: PaymentType;
  cod_amount: number;
  total_amount_paise: number;
  timeline: TimelineEvent[];
  /** The courier's label can be downloaded (live data only). */
  label_available?: boolean;
  /** The courier is processing a cancellation. */
  cancel_requested?: boolean;
  /** Why the courier refused the last cancellation. */
  cancel_error?: string | null;
}

export interface CancelShipmentResult {
  status: 'CANCEL_REQUESTED' | 'CANCELLED';
}

export type CreateShipmentInput = StandardShipmentRequestInput;

export interface CreateShipmentResult {
  shipment_id: string;
  reference_id: string;
  /** Null until the courier confirms the booking. */
  awb: string | null;
  carrier: CarrierName;
  status: NormalizedStatus;
  created_at: string;
}

export interface OrdersService {
  listOrders(query: OrderListQuery): Promise<DataResult<OrderListResult>>;
  getOrderDetail(idOrAwb: string): Promise<DataResult<OrderDetail>>;
  createShipment(input: CreateShipmentInput): Promise<DataResult<CreateShipmentResult>>;
  /** Asks the courier to cancel; it confirms asynchronously. */
  cancelShipment(idOrAwb: string, reason?: string): Promise<DataResult<CancelShipmentResult>>;
}

