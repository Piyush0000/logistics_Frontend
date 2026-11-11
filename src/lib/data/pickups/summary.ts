import { addDays } from '../../format/calendar';
import { indianDay } from '../../format/date';
import type { Pickup } from './types';

export interface PickupsSummary {
  scheduledToday: number;
  pickedUpToday: number;
  /** Shipments ready to ship that no courier has collected yet. */
  pending: number;
  /** The last seven days, oldest first, counting pickups that were not cancelled. */
  days: { day: string; label: string; value: number }[];
}

export const CHART_DAYS = 7;

/** 2026-11-05 as "5 Nov". The day is a calendar date, so UTC is used only to name the month. */
export function dayLabel(day: string): string {
  const month = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }).format(
    new Date(`${day}T00:00:00Z`),
  );
  return `${Number(day.slice(8))} ${month}`;
}

/** Tiles and 7-day chart figures for the dashboard's Pickups tab. `today` can be injected. */
export function summarizePickups(
  pickups: readonly Pickup[],
  readyCount: number,
  today: string | Date = new Date(),
): PickupsSummary {
  const end = indianDay(today);
  const days = Array.from({ length: CHART_DAYS }, (_, index) =>
    addDays(end, index - (CHART_DAYS - 1)),
  );
  const counts = new Map(days.map((day) => [day, 0]));
  let scheduledToday = 0;
  let pickedUpToday = 0;

  for (const pickup of pickups) {
    if (pickup.status === 'cancelled') continue;
    const day = indianDay(pickup.pickupDate);
    if (day === end && pickup.status === 'scheduled') scheduledToday += 1;
    if (day === end && pickup.status === 'picked_up') pickedUpToday += 1;
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return {
    scheduledToday,
    pickedUpToday,
    pending: readyCount,
    days: days.map((day) => ({ day, label: dayLabel(day), value: counts.get(day) ?? 0 })),
  };
}
