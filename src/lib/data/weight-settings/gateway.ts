import { notAvailable } from '../not-available';
import type { WeightSettingsService } from './types';

// The backend has no package preset route yet, so sample presets never pass as real ones.
export const gatewayWeightSettingsService: WeightSettingsService = {
  listPresets: notAvailable,
  savePreset: notAvailable,
  deletePreset: notAvailable,
};
