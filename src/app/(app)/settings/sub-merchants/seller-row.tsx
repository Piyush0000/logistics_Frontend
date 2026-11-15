import { Store } from 'lucide-react';
import type { SubMerchant } from '@/lib/data/sub-merchants';
import { formatDate } from '@/lib/format/date';
import { KYC_STATUS_LABEL } from '@/lib/kyc';

/** KYC chip tone by meaning: verified is good, submitted waits, rejected needs action. */
const KYC_TONE: Record<SubMerchant['kycStatus'], string> = {
  not_started: 'bg-muted',
  submitted: 'bg-warning/15',
  verified: 'bg-success/15',
  rejected: 'bg-error/15',
};

/** One seller. Only the last 4 digits of the bank account reach the page. */
export function SellerRow({ seller }: { seller: SubMerchant }) {
  return (
    <li
      data-testid="sub-merchant"
      className="grid min-w-0 gap-3 rounded-control border border-secondary p-3 transition-colors duration-150 hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:p-4"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="hidden size-10 shrink-0 place-items-center rounded-control bg-muted text-primary min-[360px]:grid">
          <Store aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">{seller.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${KYC_TONE[seller.kycStatus]}`}>
            {KYC_STATUS_LABEL[seller.kycStatus]}
          </span>
        </p>
        <p className="text-sm text-on-surface/70 [overflow-wrap:anywhere]">{seller.email}</p>
        <p className="text-sm text-on-surface/70 [overflow-wrap:anywhere]">{seller.gstin ?? 'No GSTIN'}</p>
        </div>
      </div>
      <div className="min-w-0 text-sm text-on-surface/70 sm:text-right">
        <p className="font-mono">Account ending {seller.bankLast4}</p>
        <p>Onboarded {formatDate(seller.createdAt)}</p>
      </div>
    </li>
  );
}
