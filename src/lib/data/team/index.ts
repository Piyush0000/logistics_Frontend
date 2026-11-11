import { resolveDataSource } from '../source';
import { gatewayTeamService } from './gateway';
import { mockTeamService } from './mock';
import type { TeamService } from './types';

export * from './input';
export { LAST_ADMIN_MESSAGE } from './mock';
export * from './types';

export function teamService(): TeamService {
  return resolveDataSource('team') === 'gateway' ? gatewayTeamService : mockTeamService;
}
