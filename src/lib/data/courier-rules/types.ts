import type { CarrierName } from '@logicore/contracts';
import type { DataResult } from '../source';

export const PREFERENCES = ['lowest_cost', 'fastest', 'custom'] as const;
export type AllocationPreference = (typeof PREFERENCES)[number];

export const PREFERENCE_LABELS: Record<AllocationPreference, string> = {
  lowest_cost: 'Lowest cost',
  fastest: 'Fastest',
  custom: 'Custom',
};

export const PREFERENCE_DESCRIPTIONS: Record<AllocationPreference, string> = {
  lowest_cost: 'Pick the courier with the cheapest rate for each shipment.',
  fastest: 'Pick the courier with the shortest delivery time for each shipment.',
  custom: 'Try couriers in the order you set below, and use the first one that can deliver.',
};

export const isPreference = (value: unknown): value is AllocationPreference =>
  typeof value === 'string' && (PREFERENCES as readonly string[]).includes(value);

export interface CourierRules {
  preference: AllocationPreference;
  /** Every carrier exactly once, first choice first. */
  priority: CarrierName[];
  /** Carriers switched off. At least one carrier always stays on. */
  disabled: CarrierName[];
}

export interface CourierRulesService {
  get(): Promise<DataResult<CourierRules>>;
  save(rules: CourierRules): Promise<DataResult<CourierRules>>;
}
