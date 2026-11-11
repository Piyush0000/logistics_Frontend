import { notAvailable } from '../not-available';
import type { TeamService } from './types';

// The backend has no team route yet, so a sample team never passes as the real one.
export const gatewayTeamService: TeamService = {
  listMembers: notAvailable,
  invite: notAvailable,
  changeRole: notAvailable,
  remove: notAvailable,
};
