import { describe, expect, it } from 'vitest';
import { gatewayTrackingPageService } from './gateway';
import { trackingPageService } from './index';
import { ACCENTS, checkLogo, MAX_LOGO_BYTES, parseBrandingInput } from './input';
import { createMockTrackingPageService, mockTrackingPageService } from './mock';

const valid = {
  displayName: 'Asha Mart',
  supportEmail: 'help@asha.example',
  supportPhone: '+919811111111',
  accent: 'accent',
  showCourier: false,
  logoName: 'logo.png',
};

describe('parseBrandingInput', () => {
  it('accepts valid branding and trims text', () => {
    const result = parseBrandingInput({ ...valid, displayName: '  Asha Mart  ' });
    expect(result).toEqual({ ok: true, value: valid });
  });

  it('allows an empty support email and phone', () => {
    const result = parseBrandingInput({ ...valid, supportEmail: '', supportPhone: '' });
    expect(result.ok).toBe(true);
  });

  it('limits the display name to 1 to 40 characters', () => {
    expect(parseBrandingInput({ ...valid, displayName: '   ' })).toMatchObject({ ok: false, errors: { displayName: expect.any(String) } });
    expect(parseBrandingInput({ ...valid, displayName: 'a'.repeat(41) })).toMatchObject({ ok: false, errors: { displayName: expect.any(String) } });
    expect(parseBrandingInput({ ...valid, displayName: 'a'.repeat(40) }).ok).toBe(true);
  });

  it('validates the support email and phone', () => {
    expect(parseBrandingInput({ ...valid, supportEmail: 'not-an-email' })).toMatchObject({ ok: false, errors: { supportEmail: expect.any(String) } });
    expect(parseBrandingInput({ ...valid, supportPhone: '12345' })).toMatchObject({ ok: false, errors: { supportPhone: expect.any(String) } });
  });

  it('offers only palette accents', () => {
    expect(ACCENTS).toEqual(['primary', 'accent', 'success']);
    for (const bad of ['#ff0000', 'red', 'warning', '', 5, null]) {
      expect(parseBrandingInput({ ...valid, accent: bad })).toMatchObject({ ok: false, errors: { accent: expect.any(String) } });
    }
  });

  it('rejects a logo name that is not a plain PNG or SVG name', () => {
    expect(parseBrandingInput({ ...valid, logoName: 'x.exe' }).ok).toBe(false);
    expect(parseBrandingInput({ ...valid, logoName: '../../logo.png' }).ok).toBe(false);
    expect(parseBrandingInput({ ...valid, logoName: null }).ok).toBe(true);
  });

  it('refuses a non-object', () => {
    expect(parseBrandingInput(null).ok).toBe(false);
    expect(parseBrandingInput('x').ok).toBe(false);
  });
});

describe('checkLogo', () => {
  const png = { name: 'logo.png', type: 'image/png', size: 1000 };

  it('accepts a PNG or SVG up to 1 MB', () => {
    expect(checkLogo(png)).toBeNull();
    expect(checkLogo({ name: 'logo.svg', type: 'image/svg+xml', size: MAX_LOGO_BYTES })).toBeNull();
  });

  it('rejects a 2 MB logo', () => {
    expect(checkLogo({ ...png, size: 2 * 1024 * 1024 })).toBe('logo.png is larger than 1 MB.');
  });

  it('rejects other types and empty files', () => {
    expect(checkLogo({ name: 'logo.gif', type: 'image/gif', size: 10 })).toBe('logo.gif is not a PNG or SVG file.');
    expect(checkLogo({ name: 'logo.png', type: 'image/jpeg', size: 10 })).toBe('logo.png is not a PNG or SVG file.');
    expect(checkLogo({ ...png, size: 0 })).toBe('logo.png is empty.');
  });
});

describe('mock tracking-page service', () => {
  it('starts with sample branding and keeps a save', async () => {
    const service = createMockTrackingPageService();
    const first = await service.get();
    expect(first).toMatchObject({ ok: true, source: 'mock' });
    expect(await service.save(valid as never)).toEqual({ ok: true, source: 'mock', data: valid });
    expect(await service.get()).toEqual({ ok: true, source: 'mock', data: valid });
  });

  it('refuses bad branding without changing anything', async () => {
    const service = createMockTrackingPageService();
    const before = await service.get();
    expect(await service.save({ ...valid, accent: '#ff0000' } as never)).toMatchObject({ ok: false, error: { kind: 'validation' } });
    expect(await service.get()).toEqual(before);
  });
});

describe('gateway tracking-page service', () => {
  it('reports unavailable for both calls', async () => {
    const expected = {
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'Coming soon: this is not connected to live data yet.' },
    };
    expect(await gatewayTrackingPageService.get()).toEqual(expected);
    expect(await gatewayTrackingPageService.save(valid as never)).toEqual(expected);
  });

  it('is picked by DATA_SOURCE_TRACKING_PAGE', () => {
    expect(trackingPageService()).toBe(mockTrackingPageService);
    process.env.DATA_SOURCE_TRACKING_PAGE = 'gateway';
    try {
      expect(trackingPageService()).toBe(gatewayTrackingPageService);
    } finally {
      delete process.env.DATA_SOURCE_TRACKING_PAGE;
    }
  });
});
