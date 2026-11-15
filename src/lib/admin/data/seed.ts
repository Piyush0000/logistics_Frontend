import 'server-only';

/**
 * Sample merchants shared by every admin module's mock data, so the same seller shows the same
 * name, city and status on Merchants, Shipments, Money and Support. Invented names, no real people.
 */

export type MerchantStatus = 'active' | 'suspended' | 'pending';
export type KycStatus = 'not_started' | 'submitted' | 'approved' | 'rejected';

export interface SeedMerchant {
  id: string;
  name: string;
  email: string;
  city: string;
  status: MerchantStatus;
  kyc: KycStatus;
  /** ISO date the merchant signed up. */
  joinedAt: string;
}

export const SEED_MERCHANTS: readonly SeedMerchant[] = [
  { id: 'mer_001', name: 'Kalpa Home Decor', email: 'ops@kalpahome.example', city: 'Jaipur', status: 'active', kyc: 'approved', joinedAt: '2026-06-02' },
  { id: 'mer_002', name: 'Neelgiri Teas', email: 'hello@neelgiri.example', city: 'Coimbatore', status: 'active', kyc: 'approved', joinedAt: '2026-06-19' },
  { id: 'mer_003', name: 'UrbanThread Apparel', email: 'support@urbanthread.example', city: 'Bengaluru', status: 'active', kyc: 'approved', joinedAt: '2026-07-08' },
  { id: 'mer_004', name: 'Sahyadri Organics', email: 'team@sahyadri.example', city: 'Pune', status: 'suspended', kyc: 'approved', joinedAt: '2026-07-21' },
  { id: 'mer_005', name: 'Pixel Gadgets', email: 'orders@pixelgadgets.example', city: 'Delhi', status: 'active', kyc: 'approved', joinedAt: '2026-08-11' },
  { id: 'mer_006', name: 'Coastal Crafts Co.', email: 'craft@coastal.example', city: 'Kochi', status: 'pending', kyc: 'submitted', joinedAt: '2026-11-09' },
  { id: 'mer_007', name: 'Mehta Pharma Supplies', email: 'dispatch@mehtapharma.example', city: 'Ahmedabad', status: 'pending', kyc: 'submitted', joinedAt: '2026-11-12' },
  { id: 'mer_008', name: 'Brew & Bean', email: 'founders@brewbean.example', city: 'Mumbai', status: 'pending', kyc: 'not_started', joinedAt: '2026-11-14' },
];

export function seedMerchant(id: string): SeedMerchant | undefined {
  return SEED_MERCHANTS.find((merchant) => merchant.id === id);
}

export const SEED_CARRIERS = ['delhivery', 'ekart', 'bluedart', 'shadowfax', 'dhl'] as const;

/** An ISO timestamp `days` days (and optional hours) before now. */
export function daysAgo(days: number, hours = 0): string {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000).toISOString();
}
