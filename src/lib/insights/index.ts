import 'server-only';

import { codService } from '@/lib/data/cod';
import { pickupsService } from '@/lib/data/pickups';
import {
  loadChecklist,
  loadNdrDashboard,
  loadShipmentSummary,
  loadWallet,
} from '@/lib/data/request-cache';
import { weightService } from '@/lib/data/weight';
import { indianDay } from '@/lib/format/date';
import { buildInsights } from './rules';
import type { Insight } from './types';

export { needsYouToday } from './rules';
export type { Insight, InsightTone } from './types';

/** Fetches every source at once and turns the answers into insights. */
export async function getInsights(): Promise<Insight[]> {
  const [summary, ndr, weight, cod, wallet, pickups, onboarding] = await Promise.all([
    loadShipmentSummary(),
    loadNdrDashboard(),
    weightService().getSummary(),
    codService().getSummary(),
    loadWallet(),
    pickupsService().listPickups({ page: 1 }),
    loadChecklist(),
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
