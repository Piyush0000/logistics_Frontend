import 'server-only';

import { gatewayCompanyService } from '../company/gateway';
import { gatewayOrdersService } from '../orders/gateway';
import { gatewayPickupAddressService } from '../pickup-addresses/gateway';
import { fromGateway } from '../source';
import { gatewayWalletService } from '../wallet/gateway';
import type { OnboardingService } from './types';

/**
 * Setup progress, worked out from the merchant's live data: KYC sent, a pickup address saved,
 * money in the wallet, and a first shipment. Any source that fails hides the checklist.
 */
export const gatewayOnboardingService: OnboardingService = {
  async getChecklist() {
    const [company, addresses, wallet, orders] = await Promise.all([
      gatewayCompanyService.getCompany(),
      gatewayPickupAddressService.list(),
      gatewayWalletService.getBalance(),
      gatewayOrdersService.listOrders({ page: 1, limit: 1 }),
    ]);
    if (!company.ok) return fromGateway({ ok: false, error: company.error });
    if (!addresses.ok) return fromGateway({ ok: false, error: addresses.error });
    if (!wallet.ok) return fromGateway({ ok: false, error: wallet.error });
    if (!orders.ok) return fromGateway({ ok: false, error: orders.error });
    return {
      ok: true,
      source: 'gateway',
      data: [
        {
          id: 'kyc',
          label: company.data.kycStatus === 'rejected' ? 'Fix and resend your KYC' : 'Complete KYC',
          href: '/settings/company',
          // Sent for review counts; the admin's approval is shown on the Company page.
          done: company.data.kycStatus === 'submitted' || company.data.kycStatus === 'verified',
        },
        {
          id: 'pickup_address',
          label: 'Add a pickup address',
          href: '/settings/pickup-addresses',
          done: addresses.data.length > 0,
        },
        {
          id: 'recharge',
          label: 'Add money to your wallet',
          href: '/finances/wallet',
          done: wallet.data.availablePaise > 0 || orders.data.total > 0,
        },
        {
          id: 'first_shipment',
          label: 'Create your first shipment',
          href: '/orders/create',
          done: orders.data.total > 0,
        },
      ],
    };
  },
};
