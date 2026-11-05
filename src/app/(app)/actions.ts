'use server';

import { parseAwbQuery } from '@/lib/awb';
import { getDemoSession } from '@/lib/auth/session';
import type { DataSource } from '@/lib/data/source';
import { trackingService, type TrackingSummary } from '@/lib/data/tracking';

export interface AwbLookup {
  awb: string;
  source: DataSource;
  tracking: TrackingSummary | null;
  error: string | null;
}

export interface AwbSearchResult {
  lookups: AwbLookup[];
  truncated: boolean;
  error?: string;
}

export async function searchAwbAction(query: string): Promise<AwbSearchResult> {
  // Server actions can be called directly, so this cannot rely on the page's own check.
  if (!(await getDemoSession())) {
    return { lookups: [], truncated: false, error: 'Sign in again to search.' };
  }

  const { awbs, truncated } = parseAwbQuery(query);
  const service = trackingService();

  const lookups = await Promise.all(
    awbs.map(async (awb): Promise<AwbLookup> => {
      const result = await service.lookup(awb);
      return result.ok
        ? { awb, source: result.source, tracking: result.data, error: null }
        : { awb, source: result.source, tracking: null, error: result.error.message };
    }),
  );

  return { lookups, truncated };
}
