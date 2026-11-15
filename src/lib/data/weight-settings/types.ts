import type { DataResult } from '../source';

export interface PackagePreset {
  id: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  isDefault: boolean;
}

/** What the form sends. A new preset has no id. */
export type PresetInput = Omit<PackagePreset, 'id'> & { id?: string };

export interface WeightSettingsService {
  listPresets(): Promise<DataResult<PackagePreset[]>>;
  savePreset(p: PresetInput): Promise<DataResult<PackagePreset>>;
  deletePreset(id: string): Promise<DataResult<null>>;
}
