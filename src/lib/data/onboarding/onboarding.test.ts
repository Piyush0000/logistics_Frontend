import { describe, expect, it } from 'vitest';
import { gatewayOnboardingService } from './gateway';
import { onboardingService } from './index';
import { mockOnboardingService } from './mock';

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

  it('gateway mode reports unavailable', async () => {
    expect(await gatewayOnboardingService.getChecklist()).toEqual({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 0, message: 'This data is not available yet.' },
    });
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
