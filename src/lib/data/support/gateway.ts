import 'server-only';

import { notAvailable } from '../not-available';
import type { SupportService } from './types';

// The backend has no support ticket route yet, so sample tickets never pass as real ones.
export const gatewaySupportService: SupportService = {
  listTickets: notAvailable,
  getTicket: notAvailable,
  createTicket: notAvailable,
  reply: notAvailable,
};
