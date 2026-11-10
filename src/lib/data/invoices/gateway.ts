import { notAvailable } from '../not-available';
import type { InvoiceService } from './types';

// The backend has no invoice route yet, so sample invoices never pass as real ones.
export const gatewayInvoiceService: InvoiceService = {
  listInvoices: notAvailable,
  getInvoice: notAvailable,
};
