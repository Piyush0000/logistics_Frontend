import type { Address } from '@logicore/contracts';
import type { DataResult } from '../source';

export interface B2bBox {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  count: number;
}

export interface B2bShipment {
  id: string;
  lrNumber: string;
  carrier: string;
  status: string;
  consignee: string;
  destinationCity: string;
  boxes: number;
  totalWeightKg: number;
  invoiceValuePaise: number;
  createdAt: string;
}

export interface B2bShipmentInput {
  consignee: Address;
  pickupAddressId: string;
  boxes: B2bBox[];
  invoiceNumber: string;
  invoiceValuePaise: number;
}

export interface B2bService {
  listShipments(query: { page: number; search: string }): Promise<
    DataResult<{ items: B2bShipment[]; page: number; pageCount: number; total: number }>
  >;
  createShipment(input: B2bShipmentInput): Promise<DataResult<B2bShipment>>;
}

export type B2bFieldErrors = Record<string, string>;

export const B2B_PAGE_SIZE = 20;
/** Invoices above this value (₹50,000, in paise) need an e-way bill. */
export const E_WAY_BILL_THRESHOLD_PAISE = 50_000 * 100;
