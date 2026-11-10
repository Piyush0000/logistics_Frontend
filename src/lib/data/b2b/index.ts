import { resolveDataSource } from '../source';
import { gatewayB2bService } from './gateway';
import { mockB2bService } from './mock';
import type { B2bService } from './types';

export * from './types';

export function b2bService(): B2bService {
  return resolveDataSource('b2b') === 'gateway' ? gatewayB2bService : mockB2bService;
}
