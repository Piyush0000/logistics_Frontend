import { resolveDataSource } from '../source';
import { gatewayProfileService } from './gateway';
import { mockProfileService } from './mock';
import type { ProfileService } from './types';

export * from './input';
export * from './types';

export function profileService(): ProfileService {
  return resolveDataSource('profile') === 'gateway' ? gatewayProfileService : mockProfileService;
}
