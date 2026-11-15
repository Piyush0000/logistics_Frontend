import 'server-only';

import { resolveDataSource } from '../source';
import { gatewayWeightSettingsService } from './gateway';
import { mockWeightSettingsService } from './mock';
import type { WeightSettingsService } from './types';

export * from './input';
export * from './types';

export function weightSettingsService(): WeightSettingsService {
  return resolveDataSource('weight_settings') === 'gateway'
    ? gatewayWeightSettingsService
    : mockWeightSettingsService;
}
