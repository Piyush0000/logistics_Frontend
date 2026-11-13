import type { CodSummary } from '@/lib/data/cod/types';
import type { NdrDashboardData } from '@/lib/data/ndr/types';
import type { OnboardingItem } from '@/lib/data/onboarding/types';
import type { Pickup } from '@/lib/data/pickups/types';
import type { ShipmentSummary } from '@/lib/data/shipments/summary';
import type { DataResult } from '@/lib/data/source';
import type { WalletBalance } from '@/lib/data/wallet/types';
import type { WeightSummary } from '@/lib/data/weight/types';

export type InsightTone = 'action' | 'warning' | 'good' | 'info';

/** One thing worth knowing, built from data the services already return. No AI involved. */
export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
  href: string;
  /** True when it was built from sample data, so the UI shows the Sample data badge. */
  isSample: boolean;
}

export interface InsightInput {
  summary?: DataResult<ShipmentSummary>;
  ndr?: DataResult<NdrDashboardData>;
  weight?: DataResult<WeightSummary>;
  cod?: DataResult<CodSummary>;
  wallet?: DataResult<WalletBalance>;
  pickups?: DataResult<{ items: Pickup[] }>;
  onboarding?: DataResult<OnboardingItem[]>;
  /** Today in India, YYYY-MM-DD. */
  today: string;
}
