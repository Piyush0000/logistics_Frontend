/** Delivered as a share of sent, with one decimal: 980 of 1,000 is "98.0%". No messages sent shows a dash. */
export function deliveryRate(sent: number, delivered: number): string {
  if (!Number.isFinite(sent) || !Number.isFinite(delivered) || sent <= 0) return '—';
  const share = Math.min(100, Math.max(0, (delivered / sent) * 100));
  return `${share.toFixed(1)}%`;
}
