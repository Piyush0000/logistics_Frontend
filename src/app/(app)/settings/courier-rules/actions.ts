'use server';

import { revalidatePath } from 'next/cache';
import { carrierLabel } from '@/components/orders/carrier-badge';
import { getDemoSession } from '@/lib/auth/session';
import { createSerialQueue } from '@/lib/serial';
import type { DataResult } from '@/lib/data/source';
import {
  courierRulesService,
  isCarrier,
  moveCourier,
  PREFERENCE_LABELS,
  setCourierEnabled,
  setPreference,
  type CourierRules,
} from '@/lib/data/courier-rules';

export type RulesActionResult =
  | { ok: true; message: string; rules: CourierRules }
  | { ok: false; message: string };

const SIGN_IN_AGAIN = 'Sign in again.';

function carrierRulesError(result: Extract<DataResult<unknown>, { ok: false }>): string {
  return result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message;
}

const inOrder = createSerialQueue();

type Change =
  | { ok: true; value: CourierRules }
  | { ok: true; unchanged: string }
  | { ok: false; message: string };

/**
 * Each action changes one thing on the rules as they are stored right now, then saves. None of them
 * accepts a whole rule set, and the read, change and save run one request at a time, so overlapping
 * requests within this server cannot undo each other. A real backend has to enforce this too.
 */
function change(
  apply: (rules: CourierRules) => Change,
  describe: (rules: CourierRules) => string,
): Promise<RulesActionResult> {
  return inOrder(async () => {
    const service = courierRulesService();
    const current = await service.get();
    if (!current.ok) return { ok: false, message: carrierRulesError(current) };

    const next = apply(current.data);
    if (!next.ok) return { ok: false, message: next.message };
    if ('unchanged' in next) return { ok: true, message: next.unchanged, rules: current.data };

    const saved = await service.save(next.value);
    if (!saved.ok) return { ok: false, message: carrierRulesError(saved) };
    revalidatePath('/settings/courier-rules');
    return { ok: true, message: describe(saved.data), rules: saved.data };
  });
}

export async function setPreferenceAction(preference: unknown): Promise<RulesActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  return change(
    (rules) => setPreference(rules, preference),
    (rules) => `Preference saved. Now using ${PREFERENCE_LABELS[rules.preference].toLowerCase()}.`,
  );
}

export async function moveCourierAction(carrier: unknown, direction: unknown): Promise<RulesActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  if (!isCarrier(carrier)) return { ok: false, message: 'Choose a courier from the list.' };
  if (direction !== 'up' && direction !== 'down') return { ok: false, message: 'Choose up or down.' };
  return change(
    (rules) => {
      const at = rules.priority.indexOf(carrier);
      if (direction === 'up' && at === 0) return { ok: true, unchanged: 'Already at the top.' };
      if (direction === 'down' && at === rules.priority.length - 1) {
        return { ok: true, unchanged: 'Already at the bottom.' };
      }
      return { ok: true, value: { ...rules, priority: moveCourier(rules.priority, carrier, direction) } };
    },
    () => `Moved ${carrierLabel(carrier)} ${direction}.`,
  );
}

export async function setCourierEnabledAction(carrier: unknown, enabled: unknown): Promise<RulesActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };
  if (!isCarrier(carrier)) return { ok: false, message: 'Choose a courier from the list.' };
  if (typeof enabled !== 'boolean') return { ok: false, message: 'Choose on or off.' };
  return change(
    (rules) => setCourierEnabled(rules, carrier, enabled),
    () => `${carrierLabel(carrier)} is switched ${enabled ? 'on' : 'off'}.`,
  );
}
