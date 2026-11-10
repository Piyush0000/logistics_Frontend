import type { ApiError } from '../../gateway/errors';
import { fromMock, type DataResult } from '../source';
import { MAX_PRESETS, parsePresetInput } from './input';
import type { PackagePreset, PresetInput, WeightSettingsService } from './types';

// Invented presets. The last has a name of exactly 40 characters, so screens are tested with a long one.
const SAMPLE_PRESETS: PackagePreset[] = [
  { id: 'wp-001', name: 'Small pouch', lengthCm: 20, widthCm: 15, heightCm: 5, weightKg: 0.3, isDefault: false },
  { id: 'wp-002', name: 'Medium box', lengthCm: 30, widthCm: 20, heightCm: 10, weightKg: 1, isDefault: true },
  { id: 'wp-003', name: 'Large carton', lengthCm: 50, widthCm: 40, heightCm: 30, weightKg: 4.5, isDefault: false },
  { id: 'wp-004', name: 'Extra long fragile ceramics carton set 4', lengthCm: 120, widthCm: 25, heightCm: 25, weightKg: 6, isDefault: false },
];

function fail<T>(kind: ApiError['kind'], status: number, message: string): DataResult<T> {
  return { ok: false, source: 'mock', error: { kind, status, message } };
}

let nextId = 100;

/**
 * A preset store that keeps its changes in memory. The shared instance below is what the app uses;
 * tests make their own, so none of them depends on another.
 */
export function createMockWeightSettingsService(): WeightSettingsService {
  const store: PackagePreset[] = SAMPLE_PRESETS.map((preset) => ({ ...preset }));

  return {
    async listPresets() {
      return fromMock(store.map((preset) => ({ ...preset })));
    },

    async savePreset(input: PresetInput) {
      // The server action checks this too. It is repeated here so no caller can store a bad preset.
      const parsed = parsePresetInput(input);
      if (!parsed.ok) return fail<PackagePreset>('validation', 400, parsed.message);
      const { id, ...fields } = parsed.value;

      const existing = id === undefined ? undefined : store.find((preset) => preset.id === id);
      if (id !== undefined && !existing) return fail<PackagePreset>('not_found', 404, 'Preset not found.');
      if (!existing && store.length >= MAX_PRESETS) {
        return fail<PackagePreset>(
          'conflict',
          409,
          `You can keep at most ${MAX_PRESETS} presets. Delete one to add another.`,
        );
      }

      // Exactly one preset is the default. A lone preset always is.
      if (existing?.isDefault && !fields.isDefault && store.length > 1) {
        return fail<PackagePreset>(
          'conflict',
          409,
          'This is your default preset. Make another preset the default instead.',
        );
      }
      const isDefault = fields.isDefault || store.length === 0 || (existing !== undefined && store.length === 1);
      const saved: PackagePreset = { ...fields, isDefault, id: existing?.id ?? `wp-${nextId++}` };
      if (saved.isDefault) for (const preset of store) preset.isDefault = false;

      if (existing) Object.assign(existing, saved);
      else store.push(saved);
      return fromMock({ ...saved });
    },

    async deletePreset(id: string) {
      const index = store.findIndex((preset) => preset.id === id);
      if (index === -1) return fail<null>('not_found', 404, 'Preset not found.');
      if (store[index]!.isDefault && store.length > 1) {
        return fail<null>(
          'conflict',
          409,
          'This is your default preset. Make another preset the default, then delete this one.',
        );
      }
      store.splice(index, 1);
      return fromMock(null);
    },
  };
}

export const mockWeightSettingsService: WeightSettingsService = createMockWeightSettingsService();
