import { describe, expect, it, vi } from 'vitest';
import { gatewayOnboardingService } from './gateway';
import { onboardingService } from './index';
import { mockOnboardingService } from './mock';

vi.mock('../../auth/credentials', () => ({ merchantCredential: async () => 'evs_sess_test' }));

describe('onboardingService', () => {
  it('lists the four setup steps in order, as sample data', async () => {
    const result = await mockOnboardingService.getChecklist();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe('mock');
    expect(result.data.map(({ id, done, href }) => [id, done, href])).toEqual([
      ['kyc', false, '/settings/company'],
      ['pickup_address', true, '/settings/pickup-addresses'],
      ['recharge', true, '/finances/wallet?recharge=1'],
      ['first_shipment', false, '/orders/create'],
    ]);
    expect(result.data.map(({ label }) => label)).toEqual([
      'Complete KYC',
      'Add a pickup address',
      'Recharge your wallet',
      'Create your first shipment',
    ]);
  });

  it('works each step out from live data', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const path = new URL(url).pathname;
        if (path === '/api/v1/account/company') {
          return Response.json({ details: null, kyc_status: 'PENDING', documents: [] });
        }
        if (path === '/api/v1/account/pickup-addresses') return Response.json({ items: [] });
        if (path === '/api/v1/wallet') return Response.json({ available: 50_000, reserved: 0, pendingCod: 0 });
        return Response.json({ items: [], page: 1, limit: 1, total: 0 });
      }),
    );
    const result = await gatewayOnboardingService.getChecklist();
    vi.unstubAllGlobals();
    expect(result.ok ? null : result.error).toBeNull();
    if (!result.ok) return;
    expect(result.data.map(({ id, done }) => [id, done])).toEqual([
      ['kyc', true],
      ['pickup_address', false],
      ['recharge', true],
      ['first_shipment', false],
    ]);
  });

  it('picks the source from DATA_SOURCE_ONBOARDING', () => {
    expect(onboardingService()).toBe(mockOnboardingService);
    process.env.DATA_SOURCE_ONBOARDING = 'gateway';
    try {
      expect(onboardingService()).toBe(gatewayOnboardingService);
    } finally {
      delete process.env.DATA_SOURCE_ONBOARDING;
    }
  });
});
