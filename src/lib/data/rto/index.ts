import { resolveDataSource } from '../source';
import { gatewayRtoService } from './gateway';
import { mockRtoService } from './mock';
import type { RtoService } from './types';

export * from './types';

export function rtoService(): RtoService {
  return resolveDataSource('rto') === 'gateway' ? gatewayRtoService : mockRtoService;
}
