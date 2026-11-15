import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({ listPresets: vi.fn(), savePreset: vi.fn(), deletePreset: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/weight-settings', async (original) => ({
  ...(await original<typeof import('@/lib/data/weight-settings')>()),
  weightSettingsService: () => service,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { deletePresetAction, savePresetAction } from './actions';

const preset = { name: 'Shoe box', lengthCm: 35, widthCm: 25, heightCm: 15, weightKg: 1, isDefault: false };

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.savePreset.mockReset();
  service.deletePreset.mockReset();
});

describe('signed out', () => {
  it('refuses both actions before touching the service', async () => {
    session.current = null;

    expect(await savePresetAction(preset)).toEqual({ ok: false, message: 'Sign in again.' });
    expect(await deletePresetAction('wp-001')).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.savePreset).not.toHaveBeenCalled();
    expect(service.deletePreset).not.toHaveBeenCalled();
  });
});

describe('savePresetAction', () => {
  it('validates on the server before calling the service', async () => {
    for (const bad of [
      { ...preset, name: '   ' },
      { ...preset, name: 'a'.repeat(41) },
      { ...preset, lengthCm: 0 },
      { ...preset, heightCm: 501 },
      { ...preset, weightKg: 0.05 },
      { ...preset, weightKg: 1001 },
      null,
      'x',
    ]) {
      expect(await savePresetAction(bad)).toMatchObject({ ok: false });
    }
    expect(service.savePreset).not.toHaveBeenCalled();
  });

  it('returns field errors for the form', async () => {
    expect(await savePresetAction({ ...preset, name: '', weightKg: 0 })).toMatchObject({
      ok: false,
      errors: { name: expect.any(String), weightKg: expect.any(String) },
    });
  });

  it('sends the trimmed name and only the known fields', async () => {
    service.savePreset.mockResolvedValue({ ok: true, source: 'mock', data: { name: 'Shoe box' } });
    const result = await savePresetAction({ ...preset, name: '  Shoe box  ', id: 'wp-001', extra: 'x' });

    expect(result).toMatchObject({ ok: true });
    expect(service.savePreset).toHaveBeenCalledWith({ ...preset, id: 'wp-001' });
  });

  it('returns the service message on failure', async () => {
    service.savePreset.mockResolvedValue({
      ok: false,
      source: 'mock',
      error: { kind: 'conflict', status: 409, message: 'You can keep at most 20 presets.' },
    });
    expect(await savePresetAction(preset)).toEqual({ ok: false, message: 'You can keep at most 20 presets.' });
  });
});

describe('deletePresetAction', () => {
  it('refuses a missing id', async () => {
    expect(await deletePresetAction(42)).toMatchObject({ ok: false });
    expect(service.deletePreset).not.toHaveBeenCalled();
  });

  it('passes the id on and reports success', async () => {
    service.deletePreset.mockResolvedValue({ ok: true, source: 'mock', data: null });
    expect(await deletePresetAction('wp-002')).toMatchObject({ ok: true });
    expect(service.deletePreset).toHaveBeenCalledWith('wp-002');
  });

  it('returns the refusal for a default preset', async () => {
    service.deletePreset.mockResolvedValue({
      ok: false,
      source: 'mock',
      error: { kind: 'conflict', status: 409, message: 'Make another preset the default first.' },
    });
    expect(await deletePresetAction('wp-001')).toEqual({
      ok: false,
      message: 'Make another preset the default first.',
    });
  });
});
