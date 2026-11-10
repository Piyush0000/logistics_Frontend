import { resolveDataSource } from '../source';
import { gatewayNdrService } from './gateway';
import { mockNdrService } from './mock';
import type { NdrService } from './types';

export * from './types';

export function ndrService(): NdrService {
  return resolveDataSource('ndr') === 'gateway' ? gatewayNdrService : mockNdrService;
}
