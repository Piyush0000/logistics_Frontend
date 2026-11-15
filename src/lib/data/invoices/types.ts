import type { DataResult } from '../source';

export interface Invoice {
  id: string;
  number: string;
  /** First and last day of the billing month, as YYYY-MM-DD. */
  periodStart: string;
  periodEnd: string;
  shipments: number;
  freightPaise: number;
  codFeesPaise: number;
  /** Freight plus COD fees. */
  taxablePaise: number;
  /** 18% of the taxable amount, to the nearest paise. */
  gstPaise: number;
  totalPaise: number;
  status: 'paid' | 'due';
  issuedAt: string;
}

export interface InvoicePage {
  items: Invoice[];
  page: number;
  pageCount: number;
}

export interface InvoiceService {
  listInvoices(query: { page: number; year?: number }): Promise<DataResult<InvoicePage>>;
  getInvoice(id: string): Promise<DataResult<Invoice>>;
}
