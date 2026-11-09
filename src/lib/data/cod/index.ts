import { resolveDataSource } from '../source';
import { gatewayCodService } from './gateway';
import { mockCodService } from './mock';
import type { CodService } from './types';

export type { CodRemittance, CodRemittancePage, CodStatus, CodSummary } from './types';

export function codService(): CodService {
  return resolveDataSource('cod') === 'gateway' ? gatewayCodService : mockCodService;
}
