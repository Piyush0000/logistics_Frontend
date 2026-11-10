import { resolveDataSource } from '../source';
import { gatewayRatesService } from './gateway';
import { mockRatesService } from './mock';
import type { RatesService } from './types';

export * from './input';
export { priceInPaise, resolveZone, sortQuotes } from './quote';
export * from './types';

export function ratesService(): RatesService {
  return resolveDataSource('rates') === 'gateway' ? gatewayRatesService : mockRatesService;
}
