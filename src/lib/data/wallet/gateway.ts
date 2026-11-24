import 'server-only';

import { z } from 'zod';
import { merchantCredential } from '../../auth/credentials';
import { gatewayFetch } from '../../gateway/client';
import { fromGateway } from '../source';
import type { DebitType } from './filters';
import { PAGE_SIZE } from './mock';
import type { WalletService, WalletTransaction } from './types';

/** GET /api/v1/wallet: ledger balances in integer paise. */
const WalletSchema = z.object({
  available: z.number().int(),
  reserved: z.number().int(),
  pendingCod: z.number().int(),
});

/** GET /api/v1/wallet/transactions: the wallet's ledger lines, newest first. */
const TransactionsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      direction: z.enum(['credit', 'debit']),
      amount_paise: z.number().int(),
      reason: z.string(),
    }),
  ),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

/** A recharge as ledger-engine reports it. */
const RechargeSchema = z.object({
  id: z.string(),
  status: z.enum(['CREATED', 'PAID', 'EXPIRED', 'CANCELLED', 'FAILED']),
  amount_paise: z.number().int(),
  credited_paise: z.number().int().nullable(),
  payment_url: z.string().nullable(),
});

export async function fetchWalletBalance(token: string | null) {
  const result = await gatewayFetch('/api/v1/wallet', { schema: WalletSchema, token });
  return fromGateway(
    result.ok ? { ...result, data: { availablePaise: result.data.available } } : result,
  );
}

/** Ledger reasons are plain text from ledger-engine; RTO fees name it, other debits are freight. */
function debitTypeOf(reason: string): DebitType {
  return /rto/i.test(reason) ? 'rto-freight' : 'b2c-prepaid';
}

export const gatewayWalletService: WalletService = {
  async getBalance() {
    return fetchWalletBalance(await merchantCredential('shipments'));
  },

  async listTransactions(filters) {
    const result = await gatewayFetch('/api/v1/wallet/transactions', {
      schema: TransactionsSchema,
      token: await merchantCredential('shipments'),
      query: {
        page: filters.page,
        limit: PAGE_SIZE,
        direction: filters.type === 'all' ? undefined : filters.type,
        from: filters.from || undefined,
        to: filters.to || undefined,
      },
    });
    if (!result.ok) return fromGateway(result);
    const entries = result.data.items
      .map((line): WalletTransaction => ({
        id: line.id,
        direction: line.direction,
        debitType: line.direction === 'debit' ? debitTypeOf(line.reason) : null,
        title: line.reason,
        orderRef: null,
        amountPaise: line.amount_paise,
        breakdown: null,
        occurredAt: line.at,
      }))
      // The ledger does not store debit types; this narrows the page that was fetched.
      .filter((entry) => filters.debitType === 'all' || entry.debitType === filters.debitType);
    return {
      ok: true,
      source: 'gateway',
      data: {
        entries,
        page: result.data.page,
        pageCount: Math.max(1, Math.ceil(result.data.total / PAGE_SIZE)),
        total: result.data.total,
      },
    };
  },

  /** Opens a Cashfree payment page. The wallet is credited only after Cashfree confirms it. */
  async startRecharge(amountPaise) {
    const result = await gatewayFetch('/api/v1/wallet/recharge', {
      method: 'POST',
      schema: RechargeSchema,
      token: await merchantCredential('shipments'),
      body: { amount_paise: amountPaise },
    });
    return fromGateway(
      result.ok ? { ...result, data: { paymentUrl: result.data.payment_url } } : result,
    );
  },

  async confirmRecharge(id) {
    const result = await gatewayFetch(`/api/v1/wallet/recharge/${encodeURIComponent(id)}/confirm`, {
      method: 'POST',
      schema: RechargeSchema,
      token: await merchantCredential('shipments'),
    });
    return fromGateway(
      result.ok
        ? {
            ...result,
            data: {
              id: result.data.id,
              status: result.data.status,
              amountPaise: result.data.amount_paise,
              creditedPaise: result.data.credited_paise,
            },
          }
        : result,
    );
  },
};
