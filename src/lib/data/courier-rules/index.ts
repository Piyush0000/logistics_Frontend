import { resolveDataSource } from '../source';
import { gatewayCourierRulesService } from './gateway';
import { mockCourierRulesService } from './mock';
import type { CourierRulesService } from './types';

export * from './input';
export * from './types';

export function courierRulesService(): CourierRulesService {
  return resolveDataSource('courier_rules') === 'gateway' ? gatewayCourierRulesService : mockCourierRulesService;
}
