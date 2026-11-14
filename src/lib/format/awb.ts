/** The detail link for a shipment: by AWB when it has one, otherwise by its shipment id. */
export function orderHref(order: { awb: string; shipment_id: string }): string {
  return `/orders/${encodeURIComponent(order.awb || order.shipment_id)}`;
}

/** The AWB as shown to people; a shipment the courier has not numbered yet reads "Not assigned". */
export function awbLabel(awb: string): string {
  return awb || 'Not assigned';
}

/** The tracking tool, opened on one AWB. */
export function trackHref(awb: string): string {
  return `/tools/tracking?awb=${encodeURIComponent(awb)}`;
}
