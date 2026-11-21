import 'server-only';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { notAvailable } from '../../../data/not-available';
import type { DataResult } from '../../../data/source';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken, gatewayError, mapResult } from '../admin-fetch';
import { ADMIN_PAGE_SIZE } from '../common';
import type {
  AdminMoneyService,
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

function toWallet(w: z.infer<typeof walletSchema>): MerchantWallet {
  return {
    merchantId: w.merchant_id,
    merchantName: w.merchant_name,
    balancePaise: w.available,
    holdPaise: w.reserved,
    // Recharges come from the Orbit wallet, which does not report them here yet.
    lastRechargeAt: null,
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
    return mapResult(await wallets(), ({ items }) => ({
      walletFloatPaise: items.reduce((sum, w) => sum + Math.max(0, w.available), 0),
      negativeWallets: items.filter((w) => w.available < 0).length,
      // COD the couriers have collected and not paid out yet, as the ledger records it.
      codOutstandingPaise: items.reduce((sum, w) => sum + w.pending_cod, 0),
      // Remittance reconciliation is not stored yet, so no batch has been found short.
      shortPaymentsPaise: 0,
      shortBatches: 0,
    }));
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
  // COD remittance batches and their reconciliation are not stored by the backend yet.
  listRemittances: notAvailable,
  getRemittance: notAvailable,
  reconcileRemittance: notAvailable,
  verifyBankTransfer: notAvailable,
  listCodExceptions: notAvailable,
  resolveCodException: notAvailable,
  listOverdueRemittances: notAvailable,
};
