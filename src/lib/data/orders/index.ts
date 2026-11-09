import { resolveDataSource } from '../source';
import { gatewayOrdersService } from './gateway';
import { mockOrdersService } from './mock';

export * from './types';

export function ordersService() {
  return resolveDataSource('orders') === 'gateway'
    ? gatewayOrdersService
    : mockOrdersService;
}

