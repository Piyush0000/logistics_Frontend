/** GST on shipping charges is 18%. */
const GST_PERCENT = 18;

/** GST on a taxable amount in paise, rounded to the nearest paise (half a paisa rounds up). */
export function gstOf(taxablePaise: number): number {
  return Math.floor((taxablePaise * GST_PERCENT + 50) / 100);
}

/** The years the year filter offers, newest first. */
export const INVOICE_YEARS = [2026, 2025, 2024] as const;

export const INVOICES_PAGE_SIZE = 10;
