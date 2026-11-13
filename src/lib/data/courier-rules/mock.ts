import 'server-only';

import type { ApiError } from '../../gateway/errors';
import { fromMock, type DataResult } from '../source';
import { DEFAULT_RULES, parseCourierRules } from './input';
import type { CourierRules, CourierRulesService } from './types';

const copy = (rules: CourierRules): CourierRules => ({
  preference: rules.preference,
  priority: [...rules.priority],
  disabled: [...rules.disabled],
});

function fail(kind: ApiError['kind'], status: number, message: string): DataResult<CourierRules> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

/**
 * Rules that live in memory. The shared instance below is what the app uses; tests make their own.
 * `save` runs the same check as every caller, so no caller can store an incomplete order.
 */
export function createMockCourierRulesService(seed: CourierRules = DEFAULT_RULES): CourierRulesService {
  let rules = copy(seed);
  return {
    async get() {
      return fromMock(copy(rules));
    },
    async save(next) {
      const parsed = parseCourierRules(next);
      if (!parsed.ok) return fail('validation', 400, parsed.message);
      rules = copy(parsed.value);
      return fromMock(copy(rules));
    },
  };
}

export const mockCourierRulesService: CourierRulesService = createMockCourierRulesService();
