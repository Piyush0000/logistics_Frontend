import { Calculator, PackagePlus, Search, Wallet, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

const ACTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Create Shipment', href: '/orders/create', icon: PackagePlus },
  { label: 'Track a Shipment', href: '/tools/tracking', icon: Search },
  { label: 'Recharge Wallet', href: '/finances/wallet?recharge=1', icon: Wallet },
  { label: 'Rate Calculator', href: '/tools/rate-calculator', icon: Calculator },
];

/** Four shortcuts to the things a merchant does most: two per row on phones, four across on desktop. */
export function QuickActions() {
  return (
    <nav
      aria-label="Quick actions"
      data-testid="quick-actions"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5"
    >
      {ACTIONS.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-14 min-w-0 items-center gap-3 rounded-card border border-secondary bg-surface p-3 text-sm font-medium transition-colors hover:border-primary active:bg-tertiary lg:p-card lg:text-base"
        >
          <span className="hidden size-9 shrink-0 min-[360px]:grid place-items-center rounded-control bg-muted text-primary">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 break-words">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
