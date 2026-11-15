import 'server-only';

import { notAvailable } from '../not-available';
import type { NotificationService } from './types';

// The backend has no buyer notification route yet, so sample settings never pass as real ones.
export const gatewayNotificationService: NotificationService = {
  get: notAvailable,
  save: notAvailable,
};
