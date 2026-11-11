import { describe, expect, it } from 'vitest';
import { gatewayProfileService } from './gateway';
import { profileService } from './index';
import { parsePasswordChange, parseProfileInput } from './input';
import { createMockProfileService, mockProfileService } from './mock';

describe('parseProfileInput', () => {
  it('trims the name and accepts the limits', () => {
    expect(parseProfileInput({ name: `  ${'a'.repeat(80)} `, phone: '9800000000' })).toEqual({
      ok: true,
      value: { name: 'a'.repeat(80), phone: '9800000000' },
    });
    expect(parseProfileInput({ name: 'A', phone: '+919800000000' }).ok).toBe(true);
    expect(parseProfileInput({ name: 'A', phone: '1'.repeat(15) }).ok).toBe(true);
  });

  it('refuses an empty or over-long name', () => {
    expect(parseProfileInput({ name: '   ', phone: '9800000000' })).toMatchObject({
      ok: false,
      errors: { name: 'Enter your name.' },
    });
    expect(parseProfileInput({ name: 'a'.repeat(81), phone: '9800000000' })).toMatchObject({
      ok: false,
      errors: { name: expect.stringContaining('80') },
    });
  });

  it('refuses phones that do not match the pattern', () => {
    const bad = ['', '123456789', '1'.repeat(16), '98000 00000', '+', '++919800000000', '98000a0000', undefined];
    for (const phone of bad) {
      expect(parseProfileInput({ name: 'A', phone }).ok, String(phone)).toBe(false);
    }
  });

  it('drops unknown keys such as an email', () => {
    const result = parseProfileInput({ name: 'A', phone: '9800000000', email: 'x@y.com' });
    expect(result).toEqual({ ok: true, value: { name: 'A', phone: '9800000000' } });
  });

  it('refuses input that is not an object', () => {
    expect(parseProfileInput(null).ok).toBe(false);
    expect(parseProfileInput('x').ok).toBe(false);
  });
});

describe('parsePasswordChange', () => {
  const ok = { current: 'old-password', next: 'new-password', confirm: 'new-password' };

  it('accepts a valid change', () => {
    expect(parsePasswordChange(ok)).toEqual({ ok: true, value: ok });
  });

  it('refuses a short new password, even at 7 characters', () => {
    expect(parsePasswordChange({ ...ok, next: '1234567', confirm: '1234567' })).toMatchObject({
      ok: false,
      errors: { next: 'Use at least 8 characters.' },
    });
    expect(parsePasswordChange({ ...ok, next: '12345678', confirm: '12345678' }).ok).toBe(true);
  });

  it('refuses a confirmation that does not match', () => {
    expect(parsePasswordChange({ ...ok, confirm: 'other-password' })).toMatchObject({
      ok: false,
      errors: { confirm: 'The passwords do not match.' },
    });
  });

  it('refuses a new password equal to the current one', () => {
    const same = { current: 'same-password', next: 'same-password', confirm: 'same-password' };
    expect(parsePasswordChange(same)).toMatchObject({
      ok: false,
      errors: { next: expect.stringContaining('different') },
    });
  });

  it('refuses a missing current password and non-string input', () => {
    expect(parsePasswordChange({ ...ok, current: '' })).toMatchObject({
      ok: false,
      errors: { current: expect.any(String) },
    });
    expect(parsePasswordChange(null).ok).toBe(false);
    expect(parsePasswordChange({ current: 1, next: 2, confirm: 3 }).ok).toBe(false);
  });
});

describe('mockProfileService', () => {
  it('returns a sample profile with source: mock', async () => {
    const result = await createMockProfileService().getProfile();
    expect(result).toMatchObject({
      ok: true,
      source: 'mock',
      data: { name: expect.any(String), phone: expect.any(String) },
    });
  });

  it('keeps a saved name and phone, and never changes the email', async () => {
    const service = createMockProfileService();
    const before = await service.getProfile();
    if (!before.ok) throw new Error('get failed');

    const saved = await service.updateProfile({
      name: 'Asha Rao',
      phone: '+919811111111',
      email: 'evil@x.com',
    } as never);
    expect(saved).toMatchObject({
      ok: true,
      data: { name: 'Asha Rao', phone: '+919811111111', email: before.data.email },
    });
    expect(await service.getProfile()).toMatchObject({
      ok: true,
      data: { name: 'Asha Rao', email: before.data.email },
    });
  });

  it('refuses a bad profile and keeps the old one', async () => {
    const service = createMockProfileService();
    expect(await service.updateProfile({ name: '', phone: '1' })).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    });
    expect(await service.getProfile()).toMatchObject({ ok: true, data: { name: 'Demo Merchant' } });
  });

  it('keeps each instance separate', async () => {
    const a = createMockProfileService();
    const b = createMockProfileService();
    await a.updateProfile({ name: 'Changed', phone: '9800000000' });
    expect(await b.getProfile()).toMatchObject({ ok: true, data: { name: 'Demo Merchant' } });
  });

  it('checks a password change and never returns the passwords', async () => {
    const service = createMockProfileService();
    expect(await service.changePassword('', 'new-password')).toMatchObject({
      ok: false,
      error: { kind: 'validation' },
    });
    expect(await service.changePassword('old-password', 'short')).toMatchObject({ ok: false });
    expect(await service.changePassword('same-password', 'same-password')).toMatchObject({ ok: false });

    const done = await service.changePassword('old-password', 'brand-new-password');
    expect(done).toEqual({ ok: true, source: 'mock', data: null });
    const everything = JSON.stringify([done, await service.getProfile()]);
    expect(everything).not.toContain('old-password');
    expect(everything).not.toContain('brand-new-password');
  });
});

describe('gatewayProfileService', () => {
  const unavailable = { ok: false, source: 'gateway', error: { kind: 'unavailable' } };

  it('reports every call as unavailable', async () => {
    expect(await gatewayProfileService.getProfile()).toMatchObject(unavailable);
    expect(
      await gatewayProfileService.updateProfile({ name: 'A', phone: '9800000000' }),
    ).toMatchObject(unavailable);
    expect(await gatewayProfileService.changePassword('a', 'b')).toMatchObject(unavailable);
  });

  it('uses mock by default and gateway when set', () => {
    const saved = process.env.DATA_SOURCE_PROFILE;
    delete process.env.DATA_SOURCE_PROFILE;
    try {
      expect(profileService()).toBe(mockProfileService);
      process.env.DATA_SOURCE_PROFILE = 'gateway';
      expect(profileService()).toBe(gatewayProfileService);
    } finally {
      if (saved === undefined) delete process.env.DATA_SOURCE_PROFILE;
      else process.env.DATA_SOURCE_PROFILE = saved;
    }
  });
});
