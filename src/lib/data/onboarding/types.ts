import type { DataResult } from '../source';

export type OnboardingStep = 'kyc' | 'pickup_address' | 'recharge' | 'first_shipment';

export interface OnboardingItem {
  id: OnboardingStep;
  label: string;
  href: string;
  done: boolean;
}

export interface OnboardingService {
  getChecklist(): Promise<DataResult<OnboardingItem[]>>;
}
