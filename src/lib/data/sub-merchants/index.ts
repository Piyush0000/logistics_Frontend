import { resolveDataSource } from '../source';
import { gatewaySubMerchantService } from './gateway';
import { mockSubMerchantService } from './mock';
import type { SubMerchantService } from './types';

export * from './input';
export * from './types';

export function subMerchantService(): SubMerchantService {
  return resolveDataSource('sub_merchants') === 'gateway' ? gatewaySubMerchantService : mockSubMerchantService;
}
