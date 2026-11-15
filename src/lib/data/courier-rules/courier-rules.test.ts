import { CARRIERS } from '@logicore/contracts';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { gatewayCourierRulesService } from './gateway';
import { courierRulesService } from './index';
import {
  LAST_COURIER_MESSAGE,
  moveCourier,
  parseCourierRules,
  setCourierEnabled,
  setPreference,
} from './input';
import { createMockCourierRulesService } from './mock';
import type { CourierRules } from './types';

const BASE: CourierRules = { preference: 'custom', priority: [...CARRIERS], disabled: [] };

async function load(service = createMockCourierRulesService()) {
  const result = await service.get();
  if (!result.ok) throw new Error('get failed');
  return result.data;
}

const at = (index: number) => {
  const carrier = CARRIERS[index];
  if (!carrier) throw new Error('no such carrier');
  return carrier;
};

const everyOnce = (priority: readonly string[]) =>
  [...priority].sort().join() === [...CARRIERS].sort().join() && new Set(priority).size === CARRIERS.length;

describe('moveCourier', () => {
  it('keeps every courier exactly once after reordering', () => {
    let priority = [...CARRIERS];
    for (const step of [0, 1, 2, 3, 4, 0, 4, 2, 1, 3, 3, 0]) {
      priority = moveCourier(priority, at(step % CARRIERS.length), step % 2 ? 'up' : 'down');
      expect(everyOnce(priority)).toBe(true);
    }
  });

  it('swaps a courier with its neighbour, deterministically', () => {
    const [a, b, c] = CARRIERS;
    expect(moveCourier([...CARRIERS], b, 'up').slice(0, 3)).toEqual([b, a, c]);
    expect(moveCourier([...CARRIERS], b, 'down').slice(0, 3)).toEqual([a, c, b]);
    expect(moveCourier(moveCourier([...CARRIERS], b, 'down'), b, 'up')).toEqual([...CARRIERS]);
  });

  it('leaves the first courier at the top and the last at the bottom', () => {
    const last = at(CARRIERS.length - 1);
    expect(moveCourier([...CARRIERS], CARRIERS[0], 'up')).toEqual([...CARRIERS]);
    expect(moveCourier([...CARRIERS], last, 'down')).toEqual([...CARRIERS]);
  });
});

describe('parseCourierRules', () => {
  it('accepts a complete set', () => {
    expect(parseCourierRules(BASE)).toEqual({ ok: true, value: BASE });
  });

  it('refuses a priority that misses, repeats or invents a courier', () => {
    expect(parseCourierRules({ ...BASE, priority: CARRIERS.slice(1) }).ok).toBe(false);
    expect(parseCourierRules({ ...BASE, priority: [CARRIERS[0], ...CARRIERS] }).ok).toBe(false);
    expect(parseCourierRules({ ...BASE, priority: [...CARRIERS.slice(1), 'fedex'] }).ok).toBe(false);
  });

  it('refuses an unknown preference, a non-object and unknown disabled couriers', () => {
    expect(parseCourierRules({ ...BASE, preference: 'cheapest' }).ok).toBe(false);
    expect(parseCourierRules(null).ok).toBe(false);
    expect(parseCourierRules({ ...BASE, disabled: ['fedex'] }).ok).toBe(false);
  });

  it('refuses to switch off every courier', () => {
    expect(parseCourierRules({ ...BASE, disabled: [...CARRIERS] })).toEqual({
      ok: false,
      message: LAST_COURIER_MESSAGE,
    });
  });
});

describe('setCourierEnabled', () => {
  it('refuses to switch off the last courier', () => {
    const rules: CourierRules = { ...BASE, disabled: CARRIERS.slice(1) };
    expect(setCourierEnabled(rules, CARRIERS[0], false)).toEqual({ ok: false, message: LAST_COURIER_MESSAGE });
  });

  it('switches a courier off and on again without duplicates', () => {
    const off = setCourierEnabled(BASE, CARRIERS[1], false);
    if (!off.ok) throw new Error('expected ok');
    expect(off.value.disabled).toEqual([CARRIERS[1]]);
    const again = setCourierEnabled(off.value, CARRIERS[1], false);
    if (!again.ok) throw new Error('expected ok');
    expect(again.value.disabled).toEqual([CARRIERS[1]]);
    expect(setCourierEnabled(again.value, CARRIERS[1], true)).toEqual({ ok: true, value: BASE });
  });
});

describe('setPreference', () => {
  it('changes only the preference', () => {
    expect(setPreference(BASE, 'fastest')).toEqual({ ok: true, value: { ...BASE, preference: 'fastest' } });
    expect(setPreference(BASE, 'nope').ok).toBe(false);
  });
});

describe('mock courier rules service', () => {
  it('starts with lowest cost, every courier on and in contract order', async () => {
    expect(await load()).toEqual({ preference: 'lowest_cost', priority: [...CARRIERS], disabled: [] });
  });

  it('saves valid rules and returns them', async () => {
    const service = createMockCourierRulesService();
    const next: CourierRules = { preference: 'custom', priority: [...CARRIERS].reverse(), disabled: [CARRIERS[0]] };
    expect(await service.save(next)).toMatchObject({ ok: true, source: 'mock', data: next });
    expect(await load(service)).toEqual(next);
  });

  it('refuses invalid rules and keeps what was saved before', async () => {
    const service = createMockCourierRulesService();
    expect(await service.save({ ...BASE, disabled: [...CARRIERS] })).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    });
    expect((await load(service)).disabled).toEqual([]);
  });

  it('returns copies, so callers cannot change the stored rules', async () => {
    const service = createMockCourierRulesService();
    (await load(service)).priority.reverse();
    expect((await load(service)).priority).toEqual([...CARRIERS]);
  });
});

describe('gateway courier rules service', () => {
  let server: Server | undefined;
  afterEach(() => server?.close());

  it('has no route, so it is unavailable and never calls the backend', async () => {
    let calls = 0;
    server = createServer((_req, res) => {
      calls += 1;
      res.end('{}');
    });
    const unavailable = { ok: false, source: 'gateway', error: { kind: 'unavailable' } };
    expect(await gatewayCourierRulesService.get()).toMatchObject(unavailable);
    expect(await gatewayCourierRulesService.save(BASE)).toMatchObject(unavailable);
    expect(calls).toBe(0);
  });

  it('is chosen by DATA_SOURCE_COURIER_RULES', () => {
    const before = process.env.DATA_SOURCE_COURIER_RULES;
    process.env.DATA_SOURCE_COURIER_RULES = 'gateway';
    expect(courierRulesService()).toBe(gatewayCourierRulesService);
    delete process.env.DATA_SOURCE_COURIER_RULES;
    expect(courierRulesService()).not.toBe(gatewayCourierRulesService);
    if (before !== undefined) process.env.DATA_SOURCE_COURIER_RULES = before;
  });
});
