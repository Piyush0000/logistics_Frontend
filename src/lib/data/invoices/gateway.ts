import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import { INVOICES_PAGE_SIZE } from './gst';
import type { Invoice, InvoiceService } from './types';

const statementSchema = z.object({
  id: z.string(),
  number: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  shipments: z.number(),
  freight_paise: z.number(),
  cod_fees_paise: z.number(),
  taxable_paise: z.number(),
  gst_paise: z.number(),
  total_paise: z.number(),
  status: z.enum(['paid', 'due']),
  issued_at: z.string(),
});

const toInvoice = (s: z.infer<typeof statementSchema>): Invoice => ({
  id: s.id,
  number: s.number,
  periodStart: s.period_start,
  periodEnd: s.period_end,
  shipments: s.shipments,
  freightPaise: s.freight_paise,
  codFeesPaise: s.cod_fees_paise,
  taxablePaise: s.taxable_paise,
  gstPaise: s.gst_paise,
  totalPaise: s.total_paise,
  status: s.status,
  issuedAt: s.issued_at,
});

/** Monthly statements of shipping charged, from /api/v1/statements. */
export const gatewayInvoiceService: InvoiceService = {
  async listInvoices({ page, year }) {
    const result = await gatewayFetch('/api/v1/statements', {
      schema: z.object({ items: z.array(statementSchema) }),
      token: await merchantCredential('shipments'),
      query: { year },
    });
    if (!result.ok) return fromGateway(result);
    const all = result.data.items.map(toInvoice);
    const pageCount = Math.max(1, Math.ceil(all.length / INVOICES_PAGE_SIZE));
    const current = Math.min(Math.max(page, 1), pageCount);
    return fromGateway({
      ...result,
      data: {
        items: all.slice((current - 1) * INVOICES_PAGE_SIZE, current * INVOICES_PAGE_SIZE),
        page: current,
        pageCount,
      },
    });
  },

  async getInvoice(id) {
    const result = await gatewayFetch(`/api/v1/statements/${encodeURIComponent(id)}`, {
      schema: statementSchema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(result.ok ? { ...result, data: toInvoice(result.data) } : result);
  },
};
