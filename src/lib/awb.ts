export const MAX_AWBS = 10;

/** Each AWB is one gateway call, so a single search is capped. */
export function parseAwbQuery(query: string): { awbs: string[]; truncated: boolean } {
  const unique = [...new Set(query.split(/[\s,]+/).filter(Boolean))];
  return { awbs: unique.slice(0, MAX_AWBS), truncated: unique.length > MAX_AWBS };
}
