import type { ApiError } from '@/lib/gateway/errors';

/** What a merchant reads when a booking fails. Shared by Create Shipment and Bulk Upload. */
export function bookingErrorMessage(error: ApiError): string {
  const message = error.message || 'Failed to create shipment';
  return error.kind === 'unavailable' ? `Booking is not available yet: ${message}` : message;
}
