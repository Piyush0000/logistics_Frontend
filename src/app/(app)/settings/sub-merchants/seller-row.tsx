import type { SubMerchant } from '@/lib/data/sub-merchants';
import { formatDate } from '@/lib/format/date';
import { KYC_STATUS_LABEL } from '@/lib/kyc';

/** One seller. Only the last 4 digits of the bank account reach the page. */
export function SellerRow({ seller }: { seller: SubMerchant }) {
  return (
    <li
      data-testid="sub-merchant"
      className="grid min-w-0 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{seller.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
            {KYC_STATUS_LABEL[seller.kycStatus]}
          </span>
        </p>
        <p className="text-sm text-on-surface/70 [overflow-wrap:anywhere]">{seller.email}</p>
        <p className="text-sm text-on-surface/70 [overflow-wrap:anywhere]">{seller.gstin ?? 'No GSTIN'}</p>
      </div>
      <div className="min-w-0 text-sm text-on-surface/70 sm:text-right">
        <p>Account ending {seller.bankLast4}</p>
        <p>Onboarded {formatDate(seller.createdAt)}</p>
      </div>
    </li>
  );
}
