import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as { email: string } | null }));
const service = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));

vi.mock('@/lib/auth/session', () => ({ getDemoSession: async () => session.current }));
vi.mock('@/lib/data/tracking-page', async (original) => ({
  ...(await original<typeof import('@/lib/data/tracking-page')>()),
  trackingPageService: () => service,
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { saveTrackingPageAction } from './actions';

const branding = {
  displayName: 'Asha Mart',
  supportEmail: 'help@asha.example',
  supportPhone: '',
  accent: 'success',
  showCourier: true,
};
const current = { displayName: 'Old', supportEmail: '', supportPhone: '', accent: 'primary', showCourier: true, logoName: 'old.png' };

beforeEach(() => {
  session.current = { email: 'ops@example.com' };
  service.get.mockReset().mockResolvedValue({ ok: true, source: 'mock', data: current });
  service.save.mockReset().mockImplementation(async (b) => ({ ok: true, source: 'mock', data: b }));
});

describe('saveTrackingPageAction', () => {
  it('refuses a signed-out caller before touching the service', async () => {
    session.current = null;
    expect(await saveTrackingPageAction({ ...branding, logo: 'keep' })).toEqual({ ok: false, message: 'Sign in again.' });
    expect(service.get).not.toHaveBeenCalled();
    expect(service.save).not.toHaveBeenCalled();
  });

  it('returns field errors for bad branding', async () => {
    const result = await saveTrackingPageAction({ ...branding, accent: '#ff0000', displayName: '', logo: 'keep' });
    expect(result).toMatchObject({ ok: false, errors: { accent: expect.any(String), displayName: expect.any(String) } });
    expect(service.save).not.toHaveBeenCalled();
  });

  it('keeps, removes or replaces the logo name', async () => {
    await saveTrackingPageAction({ ...branding, logo: 'keep' });
    expect(service.save.mock.calls[0]![0].logoName).toBe('old.png');
    await saveTrackingPageAction({ ...branding, logo: 'remove' });
    expect(service.save.mock.calls[1]![0].logoName).toBeNull();
    await saveTrackingPageAction({ ...branding, logo: { name: 'new.svg', type: 'image/svg+xml', size: 50 } });
    expect(service.save.mock.calls[2]![0].logoName).toBe('new.svg');
  });

  it('rejects a 2 MB logo and a wrong type', async () => {
    const big = await saveTrackingPageAction({ ...branding, logo: { name: 'big.png', type: 'image/png', size: 2 * 1024 * 1024 } });
    expect(big).toEqual({ ok: false, message: 'big.png is larger than 1 MB.' });
    const gif = await saveTrackingPageAction({ ...branding, logo: { name: 'a.gif', type: 'image/gif', size: 5 } });
    expect(gif).toEqual({ ok: false, message: 'a.gif is not a PNG or SVG file.' });
    expect(service.save).not.toHaveBeenCalled();
  });

  it('refuses malformed input', async () => {
    expect((await saveTrackingPageAction(null)).ok).toBe(false);
    expect((await saveTrackingPageAction({ ...branding, logo: 7 })).ok).toBe(false);
    expect(service.save).not.toHaveBeenCalled();
  });

  it('saves and says the public page is not changed yet', async () => {
    const result = await saveTrackingPageAction({ ...branding, logo: 'keep' });
    expect(result).toEqual({ ok: true, message: 'Tracking page settings saved.' });
  });

  it('shows the service error', async () => {
    service.save.mockResolvedValue({ ok: false, source: 'gateway', error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' } });
    expect(await saveTrackingPageAction({ ...branding, logo: 'keep' })).toEqual({ ok: false, message: 'This data is not available yet.' });
  });
});
