import 'server-only';

import { z } from 'zod';
import { gatewayFetch } from '../../../gateway/client';
import { adminToken, mapResult } from '../admin-fetch';
import type { AdminOverviewService, AttentionItem, PlatformOverview } from './types';

const overviewSchema = z.object({
  merchants: z.object({
    total: z.number(),
    active: z.number(),
    pending_kyc: z.number(),
    suspended: z.number(),
  }),
  shipments: z.object({
    today: z.number(),
    in_transit: z.number(),
    delivered_30d: z.number(),
    rto_30d: z.number(),
    stuck: z.number(),
    failed: z.number(),
  }),
  money: z.object({
    wallet_float_paise: z.number(),
    negative_wallets: z.number(),
    cod_outstanding_paise: z.number(),
    charged_30d_paise: z.number(),
  }),
  shipments_by_day: z.array(z.object({ date: z.string(), count: z.number() })),
  pipeline: z.object({
    to_process: z.number(),
    in_transit: z.number(),
    out_for_delivery: z.number(),
    returning: z.number(),
  }),
});
type Overview = z.infer<typeof overviewSchema>;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** What needs the admin now, worked out from the live figures. */
export function attentionFor(o: Overview): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (o.merchants.pending_kyc > 0) {
    items.push({
      id: 'kyc',
      title: `${plural(o.merchants.pending_kyc, 'merchant')} waiting for KYC`,
      detail: 'They cannot book shipments until you approve them.',
      href: '/admin/onboarding?status=pending',
      tone: 'warning',
    });
  }
  if (o.shipments.stuck > 0) {
    items.push({
      id: 'stuck',
      title: `${plural(o.shipments.stuck, 'shipment')} stuck`,
      detail: 'No courier update for longer than usual.',
      href: '/admin/shipments?stuck=1',
      tone: 'error',
    });
  }
  if (o.money.negative_wallets > 0) {
    items.push({
      id: 'wallets',
      title: `${plural(o.money.negative_wallets, 'wallet')} below zero`,
      detail: 'Charges exceeded the balance after weight or RTO fees.',
      href: '/admin/money',
      tone: 'error',
    });
  }
  if (o.shipments.failed > 0) {
    items.push({
      id: 'failed',
      title: `${plural(o.shipments.failed, 'booking')} failed`,
      detail: 'The courier refused them; the reason is on each shipment.',
      href: '/admin/shipments?status=FAILED',
      tone: 'info',
    });
  }
  return items;
}

function toOverview(o: Overview): PlatformOverview {
  return {
    merchants: {
      total: o.merchants.total,
      active: o.merchants.active,
      pendingKyc: o.merchants.pending_kyc,
      suspended: o.merchants.suspended,
    },
    shipments: {
      today: o.shipments.today,
      inTransit: o.shipments.in_transit,
      delivered30d: o.shipments.delivered_30d,
      rto30d: o.shipments.rto_30d,
      stuck: o.shipments.stuck,
    },
    money: {
      walletFloatPaise: o.money.wallet_float_paise,
      codOutstandingPaise: o.money.cod_outstanding_paise,
      // Shipping charged to merchants in the last 30 days.
      revenue30dPaise: o.money.charged_30d_paise,
    },
    shipmentsByDay: o.shipments_by_day,
    pipeline: {
      toProcess: o.pipeline.to_process,
      inTransit: o.pipeline.in_transit,
      outForDelivery: o.pipeline.out_for_delivery,
      returning: o.pipeline.returning,
    },
    attention: attentionFor(o),
  };
}

export const gatewayAdminOverviewService: AdminOverviewService = {
  async getOverview() {
    const result = await gatewayFetch('/api/v1/admin/overview', {
      schema: overviewSchema,
      token: adminToken(),
      // About 20 counts behind one call: give it the gateway's full upstream budget.
      timeoutMs: 10_000,
    });
    return mapResult(result, toOverview);
  },
};
