/** Formats integer paise as rupees, for example 123456789 as ₹12,34,567.89. */
export function formatPaise(paise: number, { decimals = 2 }: { decimals?: number } = {}): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(paise / 100);
}

const COMPACT_UNITS = [
  { base: 1e7, suffix: 'Cr' },
  { base: 1e5, suffix: 'L' },
  { base: 1e3, suffix: 'K' },
] as const;

const trim = (n: number) => String(Math.round(n * 10) / 10);

/**
 * Integer paise as a short rupee figure for chart labels: ₹950, ₹1.5K, ₹1.2L, ₹3.4Cr.
 * NaN and negative amounts show as ₹0. The full amount stays in `formatPaise`.
 */
export function formatPaiseCompact(paise: number): string {
  const rupees = Number.isFinite(paise) && paise > 0 ? paise / 100 : 0;
  for (let i = 0; i < COMPACT_UNITS.length; i += 1) {
    const { base, suffix } = COMPACT_UNITS[i]!;
    if (rupees < base) continue;
    const scaled = rupees / base;
    // 99.95K rounds to 100K, which reads better as 1L.
    const larger = COMPACT_UNITS[i - 1];
    if (larger && Number(trim(scaled)) * base >= larger.base) return `₹${trim(rupees / larger.base)}${larger.suffix}`;
    return `₹${trim(scaled)}${suffix}`;
  }
  return `₹${Math.round(rupees)}`;
}
