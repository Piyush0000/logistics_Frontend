import type { CarrierName } from '@logicore/contracts';
import { isPreference, type AllocationPreference, type CourierRules } from './types';

/** The couriers the platform ships with (order-engine PLATFORM_CARRIERS), in default order. */
export const COURIERS = ['delhivery', 'shadowfax', 'ekart'] as const satisfies readonly CarrierName[];
const CARRIERS = COURIERS;

export const LAST_COURIER_MESSAGE = 'At least one courier must stay on. Switch another one on first.';

export type RulesResult = { ok: true; value: CourierRules } | { ok: false; message: string };

export const isCarrier = (value: unknown): value is CarrierName =>
  typeof value === 'string' && (CARRIERS as readonly string[]).includes(value);

export const DEFAULT_RULES: CourierRules = {
  preference: 'lowest_cost',
  priority: [...CARRIERS],
  disabled: [],
};

/**
 * The one check every save goes through: a known preference, a priority holding every courier
 * exactly once, only known couriers switched off, and at least one left on. Disabled couriers are
 * listed in priority order, so the same rules always look the same.
 */
export function parseCourierRules(input: unknown): RulesResult {
  if (typeof input !== 'object' || input === null) return { ok: false, message: 'Courier rules are missing.' };
  const { preference, priority, disabled } = input as Record<string, unknown>;

  if (!isPreference(preference)) return { ok: false, message: 'Choose lowest cost, fastest or custom.' };
  if (
    !Array.isArray(priority) ||
    priority.length !== CARRIERS.length ||
    !priority.every(isCarrier) ||
    new Set(priority).size !== CARRIERS.length
  ) {
    return { ok: false, message: 'The courier order must list every courier once.' };
  }
  if (!Array.isArray(disabled) || !disabled.every(isCarrier)) {
    return { ok: false, message: 'Switch off only couriers that exist.' };
  }

  const off = new Set<CarrierName>(disabled);
  if (off.size >= CARRIERS.length) return { ok: false, message: LAST_COURIER_MESSAGE };
  return {
    ok: true,
    value: { preference, priority: [...priority], disabled: priority.filter((c) => off.has(c)) },
  };
}

/** Swaps a courier with its neighbour. At either end, or for an unknown courier, nothing changes. */
export function moveCourier(
  priority: readonly CarrierName[],
  carrier: CarrierName,
  direction: 'up' | 'down',
): CarrierName[] {
  const next = [...priority];
  const from = next.indexOf(carrier);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= next.length) return next;
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

export function setCourierEnabled(rules: CourierRules, carrier: CarrierName, enabled: boolean): RulesResult {
  const off = new Set(rules.disabled);
  if (enabled) off.delete(carrier);
  else off.add(carrier);
  return parseCourierRules({ ...rules, disabled: [...off] });
}

export function setPreference(rules: CourierRules, preference: unknown): RulesResult {
  return parseCourierRules({ ...rules, preference: preference as AllocationPreference });
}
