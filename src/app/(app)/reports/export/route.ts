import type { NextRequest } from 'next/server';
import { getDemoSession } from '@/lib/auth/session';
import { csvRupees, toCsv } from '@/lib/csv';
import { codService } from '@/lib/data/cod';
import { ndrService } from '@/lib/data/ndr';
import { ordersService, type OrderSummary } from '@/lib/data/orders';
import type { DataResult, DataSource } from '@/lib/data/source';
import { walletService } from '@/lib/data/wallet';
import { DEBIT_TYPES } from '@/lib/data/wallet/filters';
import type { WalletTransaction } from '@/lib/data/wallet/types';
import { formatDate, formatDateTime, indianDay } from '@/lib/format/date';
import { statusLabel } from '@/lib/format/status';
import {
  reportColumns,
  reportFileName,
  validateReport,
  type ReportRequest,
} from '@/lib/reports';

const SAMPLE_NOTICE = '# Sample data';
const ORDER_PAGE_SIZE = 100;
const MAX_ORDER_PAGES = 10;
const MAX_WALLET_PAGES = 100;

type Built = DataResult<string[][]>;
type Range = Pick<ReportRequest, 'from' | 'to'>;

const inRange = (moment: string, { from, to }: Range) => {
  const day = indianDay(moment);
  return day >= from && day <= to;
};

/** Up to 10 pages of 100, stopping early when a page is short or the total is reached. */
async function listOrders(range: Range, status?: string): Promise<DataResult<OrderSummary[]>> {
  const service = ordersService();
  const items: OrderSummary[] = [];
  let source: DataSource = 'mock';

  for (let page = 1; page <= MAX_ORDER_PAGES; page += 1) {
    const result = await service.listOrders({ status, from: range.from, page, limit: ORDER_PAGE_SIZE });
    if (!result.ok) return result;
    source = result.source;
    items.push(...result.data.items);
    if (result.data.items.length < ORDER_PAGE_SIZE || items.length >= result.data.total) break;
  }

  return { ok: true, source, data: items.filter((item) => inRange(item.created_at, range)) };
}

const orderRow = (item: OrderSummary) => [
  item.reference_id,
  item.awb,
  item.carrier,
  statusLabel(item.status),
  formatDate(item.created_at),
  formatDateTime(item.last_status_at),
];

async function shipmentRows(range: Range): Promise<Built> {
  const result = await listOrders(range);
  return result.ok ? { ...result, data: result.data.map(orderRow) } : result;
}

async function rtoRows(range: Range): Promise<Built> {
  const started = await listOrders(range, 'RTO_INITIATED');
  if (!started.ok) return started;
  const back = await listOrders(range, 'RTO_DELIVERED');
  if (!back.ok) return back;
  const items = [...started.data, ...back.data].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
  return { ok: true, source: back.source, data: items.map(orderRow) };
}

async function ndrRows(range: Range): Promise<Built> {
  const result = await ndrService().getNdrDashboard();
  if (!result.ok) return result;
  const items = result.data.items.filter((item) => inRange(item.last_attempt_at, range));
  return {
    ...result,
    data: items.map((item) => [
      item.awb,
      item.reference_id,
      item.carrier,
      item.recipient_name,
      item.destination_city,
      String(item.attempt_count),
      formatDate(item.last_attempt_at),
      item.reason,
      statusLabel(item.status),
    ]),
  };
}

async function codRows(range: Range): Promise<Built> {
  const result = await codService().exportRemittances({
    status: 'all',
    from: range.from,
    to: range.to,
    page: 1,
    perPage: 20,
  });
  if (!result.ok) return result;
  return {
    ...result,
    data: result.data
      .filter((row) => inRange(row.collectedAt, range))
      .map((row) => [
        row.orderNumber,
        row.awb,
        row.courier,
        csvRupees(row.codPaise),
        csvRupees(row.deductionsPaise),
        csvRupees(row.remittablePaise),
        row.status === 'settled' ? 'Settled' : 'Pending',
        formatDate(row.collectedAt),
        row.settledAt ? formatDate(row.settledAt) : '',
      ]),
  };
}

const walletRow = (entry: WalletTransaction) => [
  formatDateTime(entry.occurredAt),
  entry.direction === 'credit' ? 'Credit' : 'Debit',
  entry.debitType
    ? `${entry.title} (${DEBIT_TYPES.find(({ value }) => value === entry.debitType)?.label ?? entry.debitType})`
    : entry.title,
  entry.orderRef ?? '',
  csvRupees(entry.direction === 'credit' ? entry.amountPaise : -entry.amountPaise),
];

async function walletRows(range: Range): Promise<Built> {
  const service = walletService();
  const entries: WalletTransaction[] = [];
  let source: DataSource = 'mock';

  for (let page = 1; page <= MAX_WALLET_PAGES; page += 1) {
    const result = await service.listTransactions({
      type: 'all',
      debitType: 'all',
      from: range.from,
      to: range.to,
      page,
    });
    if (!result.ok) return result;
    source = result.source;
    entries.push(...result.data.entries);
    if (page >= result.data.pageCount) break;
  }

  return {
    ok: true,
    source,
    data: entries.filter((entry) => inRange(entry.occurredAt, range)).map(walletRow),
  };
}

const BUILDERS: Record<ReportRequest['type'], (range: Range) => Promise<Built>> = {
  shipments: shipmentRows,
  rto: rtoRows,
  ndr: ndrRows,
  cod: codRows,
  wallet: walletRows,
};

export async function GET(request: NextRequest) {
  // This route is reachable directly, so it cannot rely on the page's own check.
  if (!(await getDemoSession())) return new Response('Sign in again.', { status: 401 });

  const validated = validateReport(Object.fromEntries(request.nextUrl.searchParams));
  if (!validated.ok) return new Response(validated.message, { status: 400 });

  const report = validated.value;
  const result = await BUILDERS[report.type](report);
  if (!result.ok) return new Response(result.error.message, { status: 503 });

  const csv = toCsv(
    reportColumns(report.type),
    result.data,
    result.source === 'mock' ? SAMPLE_NOTICE : undefined,
  );

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      // Built from validated values only, so nothing from the URL can inject a header.
      'Content-Disposition': `attachment; filename="${reportFileName(report)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
