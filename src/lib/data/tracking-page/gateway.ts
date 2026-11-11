import { notAvailable } from '../not-available';
import type { TrackingPageService } from './types';

// The gateway has no tracking-page settings route, so sample branding never passes as real.
export const gatewayTrackingPageService: TrackingPageService = {
  get: notAvailable,
  save: notAvailable,
};
