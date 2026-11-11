import { resolveDataSource } from '../source';
import { gatewayCompanyService } from './gateway';
import { mockCompanyService } from './mock';
import type { CompanyService } from './types';

export * from '../../kyc';
export * from './types';

export function companyService(): CompanyService {
  return resolveDataSource('company') === 'gateway' ? gatewayCompanyService : mockCompanyService;
}
