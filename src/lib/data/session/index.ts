import { resolveDataSource } from '../source';
import { gatewaySessionService } from './gateway';
import { mockSessionService } from './mock';
import type { SessionService } from './types';

export function sessionService(): SessionService {
  return resolveDataSource('session') === 'gateway' ? gatewaySessionService : mockSessionService;
}
