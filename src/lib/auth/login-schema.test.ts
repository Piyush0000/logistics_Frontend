import { describe, expect, it } from 'vitest';
import { emailSchema, otpSchema, passwordSchema } from './login-schema';

describe('emailSchema', () => {
  it('accepts a normal address', () => {
    expect(emailSchema.safeParse('ops@example.com').success).toBe(true);
  });

  it('trims surrounding spaces', () => {
    expect(emailSchema.parse('  ops@example.com ')).toBe('ops@example.com');
  });

  it('rejects text that is not an address', () => {
    expect(emailSchema.safeParse('ops@example').success).toBe(false);
  });

  it('rejects an empty value', () => {
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('emailSchema length', () => {
  it('accepts an address of 254 characters', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
    expect(email).toHaveLength(254);
    expect(emailSchema.safeParse(email).success).toBe(true);
  });

  it('rejects an address of 255 characters', () => {
    const email = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.com`;
    expect(email).toHaveLength(255);
    expect(emailSchema.safeParse(email).success).toBe(false);
  });
});

describe('otpSchema', () => {
  it('accepts six digits', () => {
    expect(otpSchema.safeParse('123456').success).toBe(true);
  });

  it.each(['12345', '1234567', '12a456', ''])('rejects %j', (code) => {
    expect(otpSchema.safeParse(code).success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts eight characters', () => {
    expect(passwordSchema.safeParse('12345678').success).toBe(true);
  });

  it('rejects seven characters', () => {
    expect(passwordSchema.safeParse('1234567').success).toBe(false);
  });

  it('accepts 128 characters and rejects 129', () => {
    expect(passwordSchema.safeParse('a'.repeat(128)).success).toBe(true);
    expect(passwordSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });
});
