import 'server-only';

import { codService } from '@/lib/data/cod';
import { ndrService } from '@/lib/data/ndr';
import { onboardingService } from '@/lib/data/onboarding';
import { pickupsService } from '@/lib/data/pickups';
import { shipmentService } from '@/lib/data/shipments';
import { walletService } from '@/lib/data/wallet';
import { weightService } from '@/lib/data/weight';
import { indianDay } from '@/lib/format/date';
import { buildInsights } from './rules';
import type { Insight } from './types';

export { needsYouToday } from './rules';
export type { Insight, InsightTone } from './types';

/** Fetches every source at once and turns the answers into insights. */
export async function getInsights(): Promise<Insight[]> {
  const [summary, ndr, weight, cod, wallet, pickups, onboarding] = await Promise.all([
    shipmentService().getSummary(),
    ndrService().getNdrDashboard(),
    weightService().getSummary(),
    codService().getSummary(),
    walletService().getBalance(),
    pickupsService().listPickups({ page: 1 }),
    onboardingService().getChecklist(),
  ]);
  return buildInsights({
    summary,
    ndr,
    weight,
    cod,
    wallet,
    pickups,
    onboarding,
    today: indianDay(new Date()),
  });
}
