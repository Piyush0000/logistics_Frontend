import { CARRIERS } from '@logicore/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: { email: 'ops@example.com' } as { email: string } | null }));
vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { courierRulesService, LAST_COURIER_MESSAGE } from '@/lib/data/courier-rules';
import { moveCourierAction, setCourierEnabledAction, setPreferenceAction } from './actions';

async function rules() {
  const result = await courierRulesService().get();
  if (!result.ok) throw new Error('get failed');
  return result.data;
}

describe('courier rule actions', () => {
  beforeEach(async () => {
    session.current = { email: 'ops@example.com' };
    await courierRulesService().save({ preference: 'lowest_cost', priority: [...CARRIERS], disabled: [] });
  });

  it('refuses a signed-out caller', async () => {
    session.current = null;
    const before = await rules();
    for (const result of [
      await setPreferenceAction('fastest'),
      await moveCourierAction(CARRIERS[1], 'up'),
      await setCourierEnabledAction(CARRIERS[1], false),
    ]) {
      expect(result).toEqual({ ok: false, message: 'Sign in again.' });
    }
    expect(await rules()).toEqual(before);
  });

  it('sets the preference and refuses an unknown one', async () => {
    expect(await setPreferenceAction('fastest')).toMatchObject({ ok: true });
    expect((await rules()).preference).toBe('fastest');
    expect(await setPreferenceAction('cheapest')).toMatchObject({ ok: false });
    expect(await setPreferenceAction(undefined)).toMatchObject({ ok: false });
  });

  it('moves a courier up and down from the stored order, not a sent one', async () => {
    const [a, b] = CARRIERS;
    expect(await moveCourierAction(b, 'up')).toMatchObject({ ok: true });
    expect((await rules()).priority.slice(0, 2)).toEqual([b, a]);
    expect(await moveCourierAction(b, 'down')).toMatchObject({ ok: true });
    expect((await rules()).priority).toEqual([...CARRIERS]);
  });

  it('refuses an unknown courier or direction', async () => {
    expect(await moveCourierAction('fedex', 'up')).toMatchObject({ ok: false });
    expect(await moveCourierAction(CARRIERS[0], 'sideways')).toMatchObject({ ok: false });
    expect(await setCourierEnabledAction('fedex', false)).toMatchObject({ ok: false });
    expect(await setCourierEnabledAction(CARRIERS[0], 'no')).toMatchObject({ ok: false });
  });

  it('refuses to switch off the last courier', async () => {
    for (const carrier of CARRIERS.slice(1)) {
      expect(await setCourierEnabledAction(carrier, false)).toMatchObject({ ok: true });
    }
    expect(await setCourierEnabledAction(CARRIERS[0], false)).toEqual({
      ok: false,
      message: LAST_COURIER_MESSAGE,
    });
    expect((await rules()).disabled).toHaveLength(CARRIERS.length - 1);
  });
});
