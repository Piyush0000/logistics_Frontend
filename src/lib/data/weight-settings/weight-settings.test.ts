import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gatewayWeightSettingsService } from './gateway';
import { weightSettingsService } from './index';
import { MAX_PRESETS, parsePresetInput } from './input';
import { createMockWeightSettingsService, mockWeightSettingsService } from './mock';
import type { PackagePreset, PresetInput } from './types';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

const input = (over: Partial<PresetInput> = {}): PresetInput => ({
  name: 'Shoe box',
  lengthCm: 35,
  widthCm: 25,
  heightCm: 15,
  weightKg: 1,
  isDefault: false,
  ...over,
});

type Service = ReturnType<typeof createMockWeightSettingsService>;

async function list(service: Service): Promise<PackagePreset[]> {
  const result = await service.listPresets();
  if (!result.ok) throw new Error('list failed');
  return result.data;
}

describe('parsePresetInput', () => {
  it('trims the name and accepts the limits', () => {
    const result = parsePresetInput(
      input({ name: `  ${'a'.repeat(40)}  `, lengthCm: 1, widthCm: 500, heightCm: 1, weightKg: 0.1 }),
    );
    expect(result).toMatchObject({ ok: true, value: { name: 'a'.repeat(40) } });
  });

  it('refuses a name that is empty after trimming or over 40 characters', () => {
    expect(parsePresetInput(input({ name: '   ' }))).toMatchObject({ ok: false });
    expect(parsePresetInput(input({ name: 'a'.repeat(41) }))).toMatchObject({ ok: false });
  });

  it('refuses dimensions outside 1 to 500 cm and weight outside 0.1 to 1000 kg', () => {
    for (const bad of [
      { lengthCm: 0.9 },
      { widthCm: 500.1 },
      { heightCm: -1 },
      { weightKg: 0.09 },
      { weightKg: 1000.1 },
      { weightKg: Number.NaN },
      { lengthCm: '30' },
    ]) {
      const result = parsePresetInput({ ...input(), ...bad });
      expect(result.ok, JSON.stringify(bad)).toBe(false);
    }
  });

  it('reports field errors by field name', () => {
    const result = parsePresetInput(input({ name: '', weightKg: 0 }));
    expect(result).toMatchObject({
      ok: false,
      errors: { name: expect.any(String), weightKg: expect.any(String) },
    });
  });

  it('refuses anything that is not an object', () => {
    expect(parsePresetInput(null)).toMatchObject({ ok: false });
    expect(parsePresetInput('x')).toMatchObject({ ok: false });
  });
});

describe('mock service', () => {
  let service: Service;
  beforeEach(() => {
    service = createMockWeightSettingsService();
  });

  it('starts with sample presets, exactly one default, and a sample label', async () => {
    const result = await service.listPresets();
    expect(result).toMatchObject({ ok: true, source: 'mock' });
    const presets = await list(service);
    expect(presets.length).toBeGreaterThan(2);
    expect(presets.filter((p) => p.isDefault)).toHaveLength(1);
    expect(presets.some((p) => p.name.length === 40)).toBe(true);
  });

  it('exports a shared instance that is a working service', async () => {
    expect((await mockWeightSettingsService.listPresets()).ok).toBe(true);
  });

  it('keeps exactly one default preset', async () => {
    const before = await list(service);
    const oldDefault = before.find((p) => p.isDefault)!;

    const saved = await service.savePreset(input({ isDefault: true }));
    expect(saved).toMatchObject({ ok: true, data: { name: 'Shoe box', isDefault: true } });
    const after = await list(service);
    expect(after.filter((p) => p.isDefault)).toHaveLength(1);
    expect(after.find((p) => p.isDefault)?.name).toBe('Shoe box');
    expect(after.find((p) => p.id === oldDefault.id)?.isDefault).toBe(false);

    // Making an existing preset the default moves it too.
    await service.savePreset({ ...oldDefault, isDefault: true });
    const again = await list(service);
    expect(again.filter((p) => p.isDefault).map((p) => p.id)).toEqual([oldDefault.id]);
  });

  it('refuses to turn off the default while other presets exist', async () => {
    const current = (await list(service)).find((p) => p.isDefault)!;
    const result = await service.savePreset({ ...current, isDefault: false });
    expect(result).toMatchObject({ ok: false, error: { kind: 'conflict' } });
    expect((await list(service)).filter((p) => p.isDefault)).toHaveLength(1);
  });

  it('makes the first preset the default', async () => {
    const presets = await list(service);
    for (const preset of presets.filter((p) => !p.isDefault)) await service.deletePreset(preset.id);
    await service.deletePreset(presets.find((p) => p.isDefault)!.id);
    expect(await list(service)).toEqual([]);

    const saved = await service.savePreset(input({ isDefault: false }));
    expect(saved).toMatchObject({ ok: true, data: { isDefault: true } });
  });

  it('edits a preset in place', async () => {
    const before = await list(service);
    const result = await service.savePreset({ ...before[0]!, name: 'Renamed', weightKg: 2 });
    expect(result).toMatchObject({ ok: true, data: { id: before[0]!.id, name: 'Renamed', weightKg: 2 } });
    expect(await list(service)).toHaveLength(before.length);
  });

  it('refuses an unknown id and invalid input', async () => {
    expect(await service.savePreset({ ...input(), id: 'nope' })).toMatchObject({
      ok: false,
      error: { kind: 'not_found' },
    });
    expect(await service.savePreset(input({ name: '' }))).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    });
    expect(await service.deletePreset('nope')).toMatchObject({ ok: false, error: { kind: 'not_found' } });
  });

  it('refuses a 21st preset', async () => {
    expect(MAX_PRESETS).toBe(20);
    const start = (await list(service)).length;
    for (let n = start; n < MAX_PRESETS; n += 1) {
      expect(await service.savePreset(input({ name: `Box ${n}` }))).toMatchObject({ ok: true });
    }
    expect(await list(service)).toHaveLength(20);

    const refused = await service.savePreset(input({ name: 'One too many' }));
    expect(refused).toMatchObject({ ok: false, error: { kind: 'conflict' } });
    expect(await list(service)).toHaveLength(20);

    // Editing at the limit is still allowed.
    const [first] = await list(service);
    expect(await service.savePreset({ ...first!, name: 'Edited at limit' })).toMatchObject({ ok: true });
  });

  it('deletes a preset that is not the default', async () => {
    const other = (await list(service)).find((p) => !p.isDefault)!;
    expect(await service.deletePreset(other.id)).toMatchObject({ ok: true, data: null });
    expect((await list(service)).some((p) => p.id === other.id)).toBe(false);
  });

  it('refuses to delete the default while other presets exist, and allows it for the last one', async () => {
    const presets = await list(service);
    const current = presets.find((p) => p.isDefault)!;
    const refused = await service.deletePreset(current.id);
    expect(refused).toMatchObject({ ok: false, error: { kind: 'conflict' } });
    expect((await list(service)).some((p) => p.id === current.id)).toBe(true);

    for (const preset of presets.filter((p) => !p.isDefault)) await service.deletePreset(preset.id);
    expect(await service.deletePreset(current.id)).toMatchObject({ ok: true });
    expect(await list(service)).toEqual([]);
  });

  it('does not let callers change stored presets through returned objects', async () => {
    const [first] = await list(service);
    first!.name = 'Tampered';
    expect((await list(service))[0]!.name).not.toBe('Tampered');
  });
});

describe('gatewayWeightSettingsService', () => {
  it('lists, saves and deletes presets through the settings API', async () => {
    const preset = { id: 'p1', name: 'Small box', length_cm: 20, width_cm: 15, height_cm: 10, weight_kg: 0.5, is_default: true };
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (_url, init) =>
      init?.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : init?.method === 'POST' || init?.method === 'PUT'
          ? Response.json(preset)
          : Response.json({ items: [preset] }),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await gatewayWeightSettingsService.listPresets()).toMatchObject({ ok: true, data: [{ id: 'p1', lengthCm: 20, isDefault: true }] });
    await gatewayWeightSettingsService.savePreset(input());
    await gatewayWeightSettingsService.savePreset({ ...input(), id: 'p1' });
    expect(await gatewayWeightSettingsService.deletePreset('p1')).toMatchObject({ ok: true, data: null });
    expect(fetchMock.mock.calls.map(([url, init]) => [init?.method ?? 'GET', new URL(url).pathname])).toEqual([
      ['GET', '/api/v1/settings/presets'],
      ['POST', '/api/v1/settings/presets'],
      ['PUT', '/api/v1/settings/presets/p1'],
      ['DELETE', '/api/v1/settings/presets/p1'],
    ]);
    vi.unstubAllGlobals();
  });

  it('uses mock by default and gateway when set', () => {
    expect(weightSettingsService()).toBe(mockWeightSettingsService);
    process.env.DATA_SOURCE_WEIGHT_SETTINGS = 'gateway';
    try {
      expect(weightSettingsService()).toBe(gatewayWeightSettingsService);
    } finally {
      delete process.env.DATA_SOURCE_WEIGHT_SETTINGS;
    }
  });
});
