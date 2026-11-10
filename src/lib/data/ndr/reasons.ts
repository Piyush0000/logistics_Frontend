export interface ReasonCount {
  /** Short text for the chart axis. */
  label: string;
  /** The reason as the courier gave it. */
  fullLabel: string;
  value: number;
}

const TOP = 5;
const MAX_LABEL = 12;

/**
 * A short axis label: the leading "Customer" is dropped, the text stops at the first " / " or
 * "(", and anything still over 12 characters is cut at a word boundary where it can be.
 */
function shorten(text: string): string {
  const core = text.replace(/^(customer|consignee|recipient)\s+/i, '').split(/\s\/\s|\s\(/)[0]!.trim();
  const head = core.charAt(0).toUpperCase() + core.slice(1);
  if (head.length <= MAX_LABEL) return head;
  const cut = head.slice(0, MAX_LABEL - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > 3 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** NDR records counted by reason: the five most common, then the rest together as Other. */
export function ndrReasonCounts(records: readonly { reason: string }[]): ReasonCount[] {
  const counts = new Map<string, number>();
  for (const { reason } of records) {
    const key = reason.trim() || 'No reason given';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Array.prototype.sort is stable, so ties keep the order each reason was first seen.
  const sorted = [...counts].sort((a, b) => b[1] - a[1]);
  const result: ReasonCount[] = sorted
    .slice(0, TOP)
    .map(([reason, value]) => ({ label: shorten(reason), fullLabel: reason, value }));
  const rest = sorted.slice(TOP).reduce((sum, [, value]) => sum + value, 0);
  if (rest > 0) result.push({ label: 'Other', fullLabel: 'Other reasons', value: rest });
  return result;
}
