import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/profile', async (original) => ({
  ...(await original<typeof import('@/lib/data/profile')>()),
  profileService: () => service,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { changePasswordAction, saveProfileAction } from './actions';

const profile = { name: 'Asha Rao', phone: '+919811111111' };
const passwords = { current: 'old-password', next: 'new-password', confirm: 'new-password' };

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.updateProfile.mockReset();
  service.changePassword.mockReset();
});

describe('signed out', () => {
  it('refuses both actions before touching the service', async () => {
    session.current = null;

    expect(await saveProfileAction(profile)).toEqual({ ok: false, message: 'Sign in again.' });
    expect(await changePasswordAction(passwords)).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.updateProfile).not.toHaveBeenCalled();
    expect(service.changePassword).not.toHaveBeenCalled();
  });
});

describe('saveProfileAction', () => {
  it('validates on the server before calling the service', async () => {
    for (const bad of [
      { ...profile, name: '   ' },
      { ...profile, name: 'a'.repeat(81) },
      { ...profile, phone: '12345' },
      { ...profile, phone: undefined },
      null,
    ]) {
      const result = await saveProfileAction(bad);
      expect(result.ok, JSON.stringify(bad)).toBe(false);
    }
    expect(service.updateProfile).not.toHaveBeenCalled();
  });

  it('sends only the name and phone, trimmed', async () => {
    service.updateProfile.mockResolvedValue({ ok: true, source: 'mock', data: {} });

    const result = await saveProfileAction({ name: '  Asha Rao ', phone: '+919811111111', email: 'x@y.com' });

    expect(service.updateProfile).toHaveBeenCalledWith({ name: 'Asha Rao', phone: '+919811111111' });
    expect(result).toEqual({ ok: true, message: 'Profile saved.' });
  });

  it('shows the service error, and asks to sign in again when unauthorized', async () => {
    service.updateProfile.mockResolvedValueOnce({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    });
    expect(await saveProfileAction(profile)).toEqual({
      ok: false,
      message: 'This data is not available yet.',
    });

    service.updateProfile.mockResolvedValueOnce({
      ok: false,
      source: 'gateway',
      error: { kind: 'unauthorized', status: 401, message: 'no' },
    });
    expect(await saveProfileAction(profile)).toEqual({ ok: false, message: 'Sign in again.' });
  });
});

describe('changePasswordAction', () => {
  it('refuses a short, mismatched or unchanged password without calling the service', async () => {
    for (const bad of [
      { ...passwords, next: '1234567', confirm: '1234567' },
      { ...passwords, confirm: 'different-password' },
      { current: 'same-password', next: 'same-password', confirm: 'same-password' },
      { ...passwords, current: '' },
      null,
    ]) {
      const result = await changePasswordAction(bad);
      expect(result.ok, JSON.stringify(bad)).toBe(false);
    }
    expect(service.changePassword).not.toHaveBeenCalled();
  });

  it('returns field errors for a mismatched confirmation', async () => {
    const result = await changePasswordAction({ ...passwords, confirm: 'different-password' });
    expect(result).toMatchObject({ ok: false, errors: { confirm: 'The passwords do not match.' } });
  });

  it('passes the current and new password and never echoes them', async () => {
    service.changePassword.mockResolvedValue({ ok: true, source: 'mock', data: null });

    const result = await changePasswordAction(passwords);

    expect(service.changePassword).toHaveBeenCalledWith('old-password', 'new-password');
    expect(result).toEqual({ ok: true, message: 'Password changed.' });
  });

  it('shows the service error', async () => {
    service.changePassword.mockResolvedValue({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    });
    expect(await changePasswordAction(passwords)).toEqual({
      ok: false,
      message: 'This data is not available yet.',
    });
  });
});
