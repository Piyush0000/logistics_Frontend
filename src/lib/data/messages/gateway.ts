import 'server-only';

import { notAvailable } from '../not-available';
import type { MessagesService } from './types';

// The backend has no message route yet. When it does, only this file changes.
export const gatewayMessagesService: MessagesService = {
  getStats: notAvailable,
};
