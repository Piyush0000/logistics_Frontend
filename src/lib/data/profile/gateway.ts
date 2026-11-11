import { notAvailable } from '../not-available';
import type { ProfileService } from './types';

// The backend has no profile route yet, so a sample profile never passes as the real one.
export const gatewayProfileService: ProfileService = {
  getProfile: notAvailable,
  updateProfile: notAvailable,
  changePassword: notAvailable,
};
