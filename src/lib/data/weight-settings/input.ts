import { z } from 'zod';
import type { PresetInput } from './types';

export const MAX_PRESETS = 20;
export const MAX_NAME_LENGTH = 40;

const dimension = (label: string) =>
  z
    .number({ message: `${label} must be a number.` })
    .min(1, `${label} must be at least 1 cm.`)
    .max(500, `${label} must be at most 500 cm.`);

// The same limits as a B2B box, and as DimensionsSchema in @logicore/contracts (up to 500 cm).
const PresetSchema = z.object({
  id: z.string().min(1).max(100).optional(),
  name: z
    .string({ message: 'Enter a name.' })
    .trim()
    .min(1, 'Enter a name.')
    .max(MAX_NAME_LENGTH, `Name must be at most ${MAX_NAME_LENGTH} characters.`),
  lengthCm: dimension('Length'),
  widthCm: dimension('Width'),
  heightCm: dimension('Height'),
  weightKg: z
    .number({ message: 'Weight must be a number.' })
    .min(0.1, 'Weight must be at least 0.1 kg.')
    .max(1000, 'Weight must be at most 1000 kg.'),
  isDefault: z.boolean({ message: 'Choose whether this is the default.' }),
});

export type PresetFieldErrors = Partial<Record<keyof PresetInput, string>>;

export type PresetParse =
  | { ok: true; value: PresetInput }
  | { ok: false; message: string; errors: PresetFieldErrors };

/** Checks a preset on the server. Unknown keys are dropped and the name is trimmed. */
export function parsePresetInput(input: unknown): PresetParse {
  const parsed = PresetSchema.safeParse(input);
  if (parsed.success) {
    const { id, ...rest } = parsed.data;
    return { ok: true, value: id === undefined ? rest : { ...rest, id } };
  }

  const errors: PresetFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof PresetInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, message: 'Check the highlighted fields, then try again.', errors };
}
