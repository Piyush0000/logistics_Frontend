import { resolveDataSource } from '../source';
import { gatewayInvoiceService } from './gateway';
import { mockInvoiceService } from './mock';
import type { InvoiceService } from './types';

export { gstOf, INVOICE_YEARS, INVOICES_PAGE_SIZE } from './gst';
export type { Invoice, InvoicePage, InvoiceService } from './types';

export function invoiceService(): InvoiceService {
  return resolveDataSource('invoices') === 'gateway' ? gatewayInvoiceService : mockInvoiceService;
}
