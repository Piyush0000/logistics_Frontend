import { resolveDataSource } from '../source';
import { gatewayNotificationService } from './gateway';
import { mockNotificationService } from './mock';
import type { NotificationService } from './types';

export * from './input';
export * from './types';

export function notificationService(): NotificationService {
  return resolveDataSource('notifications') === 'gateway' ? gatewayNotificationService : mockNotificationService;
}
