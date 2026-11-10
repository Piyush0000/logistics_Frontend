import { afterEach, describe, expect, it, vi } from 'vitest';
import { indianDay } from '../../format/date';
import { summarizePickups } from './summary';

describe('sample pickups', () => {
  afterEach(() => vi.useRealTimers());

  it('are dated from the current Indian day, whatever day that is', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-03-05T06:00:00Z'));
    vi.resetModules();
    const { mockPickupsService } = await import('./mock');
    const result = await mockPickupsService.listPickups({ page: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const today = indianDay(new Date());
    expect(today).toBe('2027-03-05');
    const days = result.data.items.map((pickup) => pickup.pickupDate);
    expect(days).toContain(today);
    expect(days).not.toContain('2026-11-11');
    // The sample has something to show for today and for the chart.
    const summary = summarizePickups(result.data.items, 0, today);
    expect(summary.scheduledToday).toBeGreaterThan(0);
    expect(summary.days.some((d) => d.value > 0)).toBe(true);
  });
});
