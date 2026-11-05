const LABELS: Record<string, string> = {
  CREATE_REQUESTED: 'Booking requested',
  CREATED: 'Booked',
  PICKUP_SCHEDULED: 'Pickup scheduled',
  MANIFESTED: 'Manifested',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  RTO_INITIATED: 'RTO initiated',
  RTO_DELIVERED: 'RTO delivered',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

export function statusLabel(status: string): string {
  return LABELS[status] ?? status;
}
