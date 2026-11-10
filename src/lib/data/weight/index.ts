import { resolveDataSource } from '../source';
import { gatewayWeightService } from './gateway';
import { mockWeightService } from './mock';
import type { WeightService } from './types';

export * from './input';
export * from './types';

export function weightService(): WeightService {
  return resolveDataSource('weight') === 'gateway' ? gatewayWeightService : mockWeightService;
}
