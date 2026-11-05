import type { DataResult } from './source';

/** For features the gateway has no route for yet, so they never pass as real data. */
export async function notAvailable(): Promise<DataResult<never>> {
  return {
    ok: false,
    source: 'gateway',
    error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
  };
}
