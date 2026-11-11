import { describe, expect, it } from 'vitest';
import { renderTemplate, smsParts, TEMPLATE_VARIABLES, unknownVariables } from './templates';

const values = {
  buyer_name: 'Asha',
  awb: 'EK123',
  courier: 'Ekart',
  tracking_link: 'https://example.com/track/EK123',
  store_name: 'Blue Shop',
};

describe('renderTemplate', () => {
  it('renders every known variable', () => {
    const text = TEMPLATE_VARIABLES.join(' | ');
    expect(renderTemplate(text, values)).toBe(
      'Asha | EK123 | Ekart | https://example.com/track/EK123 | Blue Shop',
    );
  });

  it('replaces repeated variables and tolerates spaces inside the braces', () => {
    expect(renderTemplate('{{awb}} {{ awb }}', values)).toBe('EK123 EK123');
  });

  it('leaves unknown variables as written and never renders a value twice', () => {
    expect(renderTemplate('{{nope}} {{buyer_name}}', { ...values, buyer_name: '{{awb}}' })).toBe(
      '{{nope}} {{awb}}',
    );
  });
});

describe('unknownVariables', () => {
  it('lists unknown variables once each, in order', () => {
    expect(unknownVariables('Hi {{buyer_name}} {{x}} {{y}} {{x}} {{ z }}')).toEqual(['{{x}}', '{{y}}', '{{z}}']);
  });

  it('is empty for known variables and plain text', () => {
    expect(unknownVariables('Hi {{awb}}, {not a variable} {{')).toEqual([]);
  });

  it('flags an empty variable', () => {
    expect(unknownVariables('a {{}} b')).toEqual(['{{}}']);
  });
});

describe('smsParts', () => {
  it('counts SMS parts at 160 characters', () => {
    expect(smsParts('')).toBe(0);
    expect(smsParts('a'.repeat(160))).toBe(1);
    expect(smsParts('a'.repeat(161))).toBe(2);
    expect(smsParts('a'.repeat(320))).toBe(2);
    expect(smsParts('a'.repeat(321))).toBe(3);
  });
});
