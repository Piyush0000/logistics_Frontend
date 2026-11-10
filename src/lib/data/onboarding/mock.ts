import { fromMock } from '../source';
import type { OnboardingItem, OnboardingService } from './types';

const CHECKLIST: OnboardingItem[] = [
  { id: 'kyc', label: 'Complete KYC', href: '/settings/company', done: false },
  {
    id: 'pickup_address',
    label: 'Add a pickup address',
    href: '/settings/pickup-addresses',
    done: true,
  },
  { id: 'recharge', label: 'Recharge your wallet', href: '/finances/wallet?recharge=1', done: true },
  { id: 'first_shipment', label: 'Create your first shipment', href: '/orders/create', done: false },
];

export const mockOnboardingService: OnboardingService = {
  async getChecklist() {
    return fromMock(CHECKLIST.map((item) => ({ ...item })));
  },
};
