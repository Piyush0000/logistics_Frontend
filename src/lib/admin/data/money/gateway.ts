import 'server-only';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { DataResult } from '../../../data/source';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken, gatewayError, mapResult } from '../admin-fetch';
import { ADMIN_PAGE_SIZE } from '../common';
import type {
  AdminMoneyService,
  BankVerification,
  CodException,
  CodRemittance,
  CodRemittanceLine,
  MerchantWallet,
  WalletLedgerEntry,
  WalletTransactionKind,
} from './types';

const walletSchema = z.object({
  merchant_id: z.string(),
  merchant_name: z.string(),
  available: z.number(),
  reserved: z.number(),
  pending_cod: z.number(),
  last_recharge_at: z.string().nullable().optional(),
});
const walletsSchema = z.object({ items: z.array(walletSchema) });

const entriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      direction: z.enum(['credit', 'debit']),
      amount_paise: z.number(),
      balance_after_paise: z.number(),
      reason: z.string(),
    }),
  ),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
});

const verificationSchema = z.object({
  bank_credit_paise: z.number(),
  variance_paise: z.number(),
  result: z.enum(['verified', 'short', 'surplus']),
  utr: z.string().nullable(),
  verified_at: z.string().nullable(),
});
const batchSchema = z.object({
  id: z.string(),
  carrier: z.string(),
  period_end: z.string(),
  due_date: z.string(),
  expected_paise: z.number(),
  received_paise: z.number(),
  status: z.enum(['expected', 'received', 'reconciled', 'short']),
  utr: z.string().nullable(),
  line_count: z.number(),
  reconciled_at: z.string().nullable(),
  bank_verification: verificationSchema.nullable(),
});
const exceptionSchema = z.object({
  id: z.string(),
  batch_id: z.string(),
  carrier: z.string(),
  awb: z.string(),
  merchant_name: z.string().nullable().optional(),
  type: z.enum(['amount_mismatch', 'unknown_awb', 'duplicate_payment']),
  status: z.enum(['open', 'resolved', 'written_off']),
  expected_paise: z.number(),
  received_paise: z.number(),
  variance_paise: z.number(),
  created_at: z.string(),
  resolution: z.object({ note: z.string(), at: z.string() }).nullable(),
});
const batchDetailSchema = z.object({
  batch: batchSchema,
  lines: z.object({
    items: z.array(
      z.object({
        awb: z.string(),
        merchant_id: z.string(),
        merchant_name: z.string(),
        expected_paise: z.number(),
        received_paise: z.number().nullable(),
        match: z.enum(['pending', 'unchecked', 'matched', 'mismatch']),
      }),
    ),
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  exceptions: z.array(exceptionSchema),
});

function toVerification(v: z.infer<typeof verificationSchema>): BankVerification {
  return {
    bankCreditPaise: v.bank_credit_paise,
    variancePaise: v.variance_paise,
    result: v.result,
    utr: v.utr,
    verifiedAt: v.verified_at ?? '',
  };
}

function toRemittance(b: z.infer<typeof batchSchema>): CodRemittance {
  return {
    id: b.id,
    carrier: b.carrier,
    periodEnd: b.period_end,
    dueDate: b.due_date,
    expectedPaise: b.expected_paise,
    receivedPaise: b.received_paise,
    status: b.status,
    utr: b.utr,
    lineCount: b.line_count,
    reconciledAt: b.reconciled_at,
    bankVerification: b.bank_verification ? toVerification(b.bank_verification) : null,
  };
}

function toException(e: z.infer<typeof exceptionSchema>): CodException {
  return {
    id: e.id,
    batchId: e.batch_id,
    carrier: e.carrier,
    awb: e.awb,
    merchantName: e.merchant_name ?? '—',
    type: e.type,
    status: e.status,
    expectedPaise: e.expected_paise,
    receivedPaise: e.received_paise,
    variancePaise: e.variance_paise,
    createdAt: e.created_at,
    resolution: e.resolution,
  };
}

const batches = () =>
  gatewayFetch('/api/v1/admin/cod/batches', {
    schema: z.object({ items: z.array(batchSchema) }),
    token: adminToken(),
  });
const codPath = (id: string) => `/api/v1/admin/cod/batches/${encodeURIComponent(id)}`;

function toWallet(w: z.infer<typeof walletSchema>): MerchantWallet {
  return {
    merchantId: w.merchant_id,
    merchantName: w.merchant_name,
    balancePaise: w.available,
    holdPaise: w.reserved,
    // The latest Cashfree recharge or admin credit, from the ledger.
    lastRechargeAt: w.last_recharge_at ?? null,
  };
}

/** Ledger reasons are plain text written by ledger-engine; shipment charges all mention it. */
function kindOf(reason: string): WalletTransactionKind {
  if (/^Admin (credit|debit):/.test(reason)) return 'adjustment';
  if (/shipment|reserv|rto/i.test(reason)) return 'shipping';
  if (/opening|recharge|top.?up/i.test(reason)) return 'recharge';
  return 'adjustment';
}

function wallets() {
  return gatewayFetch('/api/v1/admin/wallets', { schema: walletsSchema, token: adminToken() });
}

async function getMerchantWallet(merchantId: string): Promise<DataResult<MerchantWallet>> {
  const result = await wallets();
  if (!result.ok) return gatewayError(result.error);
  const wallet = result.data.items.find((w) => w.merchant_id === merchantId);
  // A merchant who never booked has no ledger account yet: an empty wallet, not an error.
  if (!wallet) {
    const merchant = await gatewayFetch(
      `/api/v1/admin/merchants/${encodeURIComponent(merchantId)}`,
      {
        schema: z.object({ name: z.string() }),
        token: adminToken(),
      },
    );
    if (!merchant.ok) {
      return merchant.error.kind === 'not_found'
        ? gatewayError({ kind: 'not_found', status: 404, message: 'Merchant not found.' })
        : gatewayError(merchant.error);
    }
    return {
      ok: true,
      source: 'gateway',
      data: {
        merchantId,
        merchantName: merchant.data.name,
        balancePaise: 0,
        holdPaise: 0,
        lastRechargeAt: null,
      },
    };
  }
  return { ok: true, source: 'gateway', data: toWallet(wallet) };
}

export const gatewayAdminMoneyService: AdminMoneyService = {
  async getSummary() {
    const [walletList, batchList] = await Promise.all([wallets(), batches()]);
    if (!walletList.ok) return gatewayError(walletList.error);
    if (!batchList.ok) return gatewayError(batchList.error);
    const items = walletList.data.items;
    const open = batchList.data.items.filter((b) => !b.reconciled_at);
    const short = batchList.data.items.filter((b) => b.status === 'short');
    return {
      ok: true,
      source: 'gateway',
      data: {
        walletFloatPaise: items.reduce((sum, w) => sum + Math.max(0, w.available), 0),
        negativeWallets: items.filter((w) => w.available < 0).length,
        // Still owed by couriers on batches not reconciled yet.
        codOutstandingPaise: open.reduce(
          (sum, b) => sum + Math.max(0, b.expected_paise - b.received_paise),
          0,
        ),
        shortPaymentsPaise: short.reduce((sum, b) => sum + (b.expected_paise - b.received_paise), 0),
        shortBatches: short.length,
      },
    };
  },

  async listWallets() {
    return mapResult(await wallets(), ({ items }) =>
      items.map(toWallet).sort((a, b) => a.merchantName.localeCompare(b.merchantName)),
    );
  },

  getMerchantWallet,

  async getWalletLedger(merchantId, page) {
    const [wallet, entries] = await Promise.all([
      getMerchantWallet(merchantId),
      gatewayFetch(`/api/v1/admin/wallets/${encodeURIComponent(merchantId)}/entries`, {
        schema: entriesSchema,
        token: adminToken(),
        query: { page, limit: ADMIN_PAGE_SIZE },
      }),
    ]);
    if (!wallet.ok) return wallet;
    return mapResult(entries, (data) => ({
      wallet: wallet.data,
      page: {
        items: data.items.map((e): WalletLedgerEntry => ({
          id: e.id,
          at: e.at,
          kind: kindOf(e.reason),
          direction: e.direction,
          amountPaise: e.amount_paise,
          balanceAfterPaise: e.balance_after_paise,
          description: e.reason,
        })),
        page: data.page,
        pageSize: data.limit,
        total: data.total,
      },
    }));
  },

  async adjustWallet({ merchantId, amountPaise, direction, reason }) {
    const result = await gatewayFetch(
      `/api/v1/admin/wallets/${encodeURIComponent(merchantId)}/adjust`,
      {
        method: 'POST',
        schema: walletSchema,
        token: adminToken(),
        // One key per confirmed adjustment, so a retried request is not booked twice.
        body: { direction, amount_paise: amountPaise, reason, idempotency_key: randomUUID() },
      },
    );
    return mapResult(result, toWallet);
  },
  async listRemittances() {
    return mapResult(await batches(), ({ items }) => items.map(toRemittance));
  },

  async recordCodPayment({ carrier, utr, lines }) {
    const result = await gatewayFetch('/api/v1/admin/cod/payments', {
      method: 'POST',
      schema: z.object({
        paid_lines: z.number(),
        unknown: z.number(),
        duplicates: z.number(),
        batches: z.array(z.string()),
      }),
      token: adminToken(),
      timeoutMs: 30_000,
      body: {
        carrier,
        utr,
        lines: lines.map((line) => ({ awb: line.awb, amount_paise: line.amountPaise })),
        // One key per upload, so a retried request is not booked twice.
        idempotency_key: randomUUID(),
      },
    });
    return mapResult(result, (r) => ({
      paidLines: r.paid_lines,
      unknown: r.unknown,
      duplicates: r.duplicates,
      batches: r.batches,
    }));
  },

  async getRemittance(id, page) {
    const result = await gatewayFetch(codPath(id), {
      schema: batchDetailSchema,
      token: adminToken(),
      query: { page },
    });
    return mapResult(result, (d) => ({
      remittance: toRemittance(d.batch),
      lines: {
        items: d.lines.items.map(
          (l): CodRemittanceLine => ({
            awb: l.awb,
            merchantId: l.merchant_id,
            merchantName: l.merchant_name,
            expectedPaise: l.expected_paise,
            receivedPaise: l.received_paise,
            match: l.match,
          }),
        ),
        page: d.lines.page,
        pageSize: d.lines.limit,
        total: d.lines.total,
      },
      exceptions: d.exceptions.map(toException),
    }));
  },

  async reconcileRemittance(id) {
    const result = await gatewayFetch(`${codPath(id)}/reconcile`, {
      method: 'POST',
      schema: z.object({ batch: batchSchema, matched: z.number(), mismatched: z.number() }),
      token: adminToken(),
      timeoutMs: 30_000,
    });
    return mapResult(result, (r) => ({
      remittance: toRemittance(r.batch),
      matched: r.matched,
      mismatched: r.mismatched,
    }));
  },

  async verifyBankTransfer(id, bankCreditPaise, utr) {
    const result = await gatewayFetch(`${codPath(id)}/verify-bank`, {
      method: 'POST',
      schema: verificationSchema,
      token: adminToken(),
      body: { bank_credit_paise: bankCreditPaise, utr },
    });
    return mapResult(result, toVerification);
  },

  async listCodExceptions() {
    const result = await gatewayFetch('/api/v1/admin/cod/exceptions', {
      schema: z.object({ items: z.array(exceptionSchema) }),
      token: adminToken(),
    });
    return mapResult(result, ({ items }) => items.map(toException));
  },

  async resolveCodException(id, resolution, note) {
    const result = await gatewayFetch(
      `/api/v1/admin/cod/exceptions/${encodeURIComponent(id)}/resolve`,
      {
        method: 'POST',
        schema: exceptionSchema,
        token: adminToken(),
        body: { resolution, note },
      },
    );
    return mapResult(result, toException);
  },

  async listOverdueRemittances() {
    const result = await gatewayFetch('/api/v1/admin/cod/overdue', {
      schema: z.object({
        items: z.array(
          z.object({
            batch_id: z.string(),
            carrier: z.string(),
            period_end: z.string(),
            due_date: z.string(),
            days_overdue: z.number(),
            expected_paise: z.number(),
          }),
        ),
      }),
      token: adminToken(),
    });
    return mapResult(result, ({ items }) =>
      items
        .map((o) => ({
          batchId: o.batch_id,
          carrier: o.carrier,
          periodEnd: o.period_end,
          dueDate: o.due_date,
          daysOverdue: o.days_overdue,
          expectedPaise: o.expected_paise,
        }))
        .sort((a, b) => b.daysOverdue - a.daysOverdue),
    );
  },
};
