import { resolveDataSource } from '../source';
import { gatewaySupportService } from './gateway';
import { mockSupportService } from './mock';
import type { SupportService } from './types';

export * from './input';
export * from './types';

export function supportService(): SupportService {
  return resolveDataSource('support') === 'gateway' ? gatewaySupportService : mockSupportService;
}
