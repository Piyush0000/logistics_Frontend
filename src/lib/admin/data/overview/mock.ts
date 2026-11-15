import 'server-only';

import { fromMock } from '../../../data/source';
import { indianDay } from '../../../format/date';
import { countPendingApplications } from '../onboarding';
import { daysAgo, SEED_MERCHANTS } from '../seed';
import type { AdminOverviewService, AttentionItem, PlatformOverview } from './types';

// Counts that match the other modules' sample data (merchants, shipments, money, system, support).
const pendingKyc = SEED_MERCHANTS.filter((merchant) => merchant.kyc === 'submitted').length;
const suspended = SEED_MERCHANTS.filter((merchant) => merchant.status === 'suspended').length;
const active = SEED_MERCHANTS.filter((merchant) => merchant.status === 'active').length;

const DAILY = [212, 238, 201, 256, 270, 249, 188, 230, 264, 281, 259, 302, 318, 294];

const ATTENTION: AttentionItem[] = [
  { id: 'kyc', title: `${pendingKyc} KYC applications waiting`, detail: 'New merchants cannot ship until you approve them.', href: '/admin/onboarding', tone: 'warning' },
  { id: 'stuck', title: '4 shipments stuck in transit', detail: 'No courier update for 4 days or more.', href: '/admin/shipments?stuck=1', tone: 'error' },
  { id: 'cod', title: 'Ekart COD remittance short by ₹2,100.00', detail: 'Batch rem_ek_1105 paid less than expected.', href: '/admin/money', tone: 'error' },
  { id: 'tickets', title: '2 high-priority tickets open', detail: 'COD payout and webhook failures.', href: '/admin/support', tone: 'warning' },
  { id: 'health', title: 'Reconciliation service is slow', detail: 'Health check answered in 912 ms.', href: '/admin/system', tone: 'info' },
];

const OVERVIEW: PlatformOverview = {
  merchants: { total: SEED_MERCHANTS.length, active, pendingKyc, suspended },
  shipments: { today: 294, inTransit: 1_126, delivered30d: 5_412, rto30d: 388, stuck: 4 },
  money: { walletFloatPaise: 17_310_000, codOutstandingPaise: 25_220_000, revenue30dPaise: 41_870_000 },
  shipmentsByDay: DAILY.map((count, index) => ({
    date: indianDay(new Date(daysAgo(DAILY.length - 1 - index))),
    count,
  })),
  pipeline: { toProcess: 342, inTransit: 1_126, outForDelivery: 287, returning: 96 },
  attention: ATTENTION,
};

export const mockAdminOverviewService: AdminOverviewService = {
  async getOverview() {
    const kycCount = countPendingApplications();
    const attention = ATTENTION.map((item) =>
      item.id === 'kyc'
        ? { ...item, title: `${kycCount} KYC application${kycCount === 1 ? '' : 's'} waiting` }
        : item,
    );
    return fromMock({
      ...OVERVIEW,
      merchants: { ...OVERVIEW.merchants, pendingKyc: kycCount },
      attention,
    });
  },
};
