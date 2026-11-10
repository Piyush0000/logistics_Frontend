import { carrierLabel } from '@/components/orders/carrier-badge';

/** RTO shipments counted by courier, most first. Ties keep the order each courier was first seen. */
export function rtoByCourier(
  shipments: readonly { carrier: string }[],
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const { carrier } of shipments) {
    const label = carrierLabel(carrier);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}
