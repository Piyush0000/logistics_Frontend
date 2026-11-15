import { describe, expect, it } from 'vitest';
import { signupSchema } from './signup-schema';

const valid = {
  company: 'Acme Traders',
  name: 'Asha Rao',
  email: 'asha@example.com',
  phone: '+919876543210',
  password: 'long-enough-1',
};

describe('signupSchema', () => {
  it('accepts valid details and trims text', () => {
    const result = signupSchema.safeParse({ ...valid, company: '  Acme Traders ' });
    expect(result.success && result.data.company).toBe('Acme Traders');
  });

  it.each([
    ['company', 'A'],
    ['company', 'x'.repeat(81)],
    ['name', ''],
    ['name', 'x'.repeat(81)],
    ['phone', '12345'],
    ['phone', '+1234567890123456'],
    ['phone', '98765abcde'],
    ['password', '1234567'],
    ['password', 'x'.repeat(129)],
  ])('rejects %s = %j', (key, value) => {
    expect(signupSchema.safeParse({ ...valid, [key]: value }).success).toBe(false);
  });

  it('accepts a phone without a plus and the longest password', () => {
    expect(
      signupSchema.safeParse({ ...valid, phone: '9876543210', password: 'x'.repeat(128) }).success,
    ).toBe(true);
  });
});
